import logging
import os
from decimal import Decimal

import requests
from django.db import transaction
from django.utils import timezone

from apps.orders.models import Order


logger = logging.getLogger(__name__)


class CourierBookingError(Exception):
    def __init__(self, message, response=None):
        super().__init__(message)
        self.response = response or {"error": message}


def _env(name, default=""):
    return os.getenv(name, default).strip()


def _order_items(order):
    items = getattr(order, "prefetched_items", None) or order.items.all()
    return list(items)


def validate_courier_order(order):
    missing = []
    if not (order.shipping_name or "").strip():
        missing.append("customer name")
    if not (order.shipping_phone or "").strip():
        missing.append("customer phone")
    if not (order.shipping_line1 or "").strip():
        missing.append("customer address")
    if not (order.shipping_city or "").strip():
        missing.append("customer city")
    if Decimal(order.grand_total or 0) <= 0:
        missing.append("COD amount")
    if not _order_items(order):
        missing.append("order items")
    if missing:
        raise CourierBookingError(f"Missing courier booking requirements: {', '.join(missing)}")


def _build_payload(order):
    items = _order_items(order)
    product_names = [item.product_name for item in items]
    total_quantity = sum(item.quantity for item in items)
    return {
        "order_id": order.number,
        "customer_name": order.shipping_name,
        "customer_phone": order.shipping_phone,
        "customer_address": order.shipping_line1,
        "customer_city": order.shipping_city,
        "cod_amount": str(order.grand_total),
        "parcel_weight": _env("COURIER_DEFAULT_WEIGHT", "1.0"),
        "product_names": product_names,
        "quantity": total_quantity,
        "special_instructions": f"Order {order.number}. Handle parcel carefully.",
        "pickup_address": _env("COURIER_PICKUP_ADDRESS"),
        "pickup_city": _env("COURIER_PICKUP_CITY"),
        "pickup_phone": _env("COURIER_PICKUP_PHONE"),
    }


def _first_value(data, keys):
    if not isinstance(data, dict):
        return ""
    for key in keys:
        value = data.get(key)
        if value:
            return str(value)
    for value in data.values():
        if isinstance(value, dict):
            nested = _first_value(value, keys)
            if nested:
                return nested
    return ""


class LeopardsCourierProvider:
    company = "leopards"

    def __init__(self):
        self.base_url = _env("COURIER_API_BASE_URL", "https://placeholder.leopards-courier.example/api/book-shipment")
        self.api_key = _env("COURIER_API_KEY")
        self.account_id = _env("COURIER_ACCOUNT_ID")

    def create_shipment(self, payload):
        if not self.api_key or not self.account_id:
            raise CourierBookingError("Courier API credentials are not configured.")

        request_payload = {
            "api_key": self.api_key,
            "account_id": self.account_id,
            "consignee_name": payload["customer_name"],
            "consignee_phone": payload["customer_phone"],
            "consignee_address": payload["customer_address"],
            "destination_city": payload["customer_city"],
            "cod_amount": payload["cod_amount"],
            "weight": payload["parcel_weight"],
            "pieces": payload["quantity"],
            "product_detail": ", ".join(payload["product_names"]),
            "remarks": payload["special_instructions"],
            "pickup_address": payload["pickup_address"],
            "pickup_city": payload["pickup_city"],
            "pickup_phone": payload["pickup_phone"],
            "reference_number": payload["order_id"],
        }
        logger.info("Courier request payload: %s", {**request_payload, "api_key": "***"})
        try:
            response = requests.post(self.base_url, json=request_payload, timeout=20)
            try:
                response_data = response.json()
            except ValueError:
                response_data = {"raw": response.text}
        except requests.RequestException as exc:
            logger.exception("Courier API request failed")
            raise CourierBookingError(str(exc), {"error": str(exc), "payload": request_payload}) from exc

        logger.info("Courier response: %s", response_data)
        if response.status_code >= 400:
            raise CourierBookingError("Courier API returned an error.", response_data)

        shipment_id = _first_value(response_data, ("shipment_id", "booking_id", "packet_id", "id"))
        tracking_number = _first_value(response_data, ("tracking_number", "track_number", "cn_number", "consignment_no", "slip_no"))
        if not tracking_number:
            raise CourierBookingError("Courier API response did not include a tracking number.", response_data)
        return {
            "shipment_id": shipment_id,
            "tracking_number": tracking_number,
            "response": response_data,
        }


class PostExCourierProvider:
    company = "postex"
    default_endpoint = "https://api.postex.pk/services/integration/api/order/v3/create-order"

    def __init__(self):
        self.api_token = _env("POSTEX_API_TOKEN")
        base_url = _env("POSTEX_API_BASE_URL", self.default_endpoint).rstrip("/")
        if base_url.endswith("/create-order"):
            self.create_order_url = base_url
        else:
            self.create_order_url = f"{base_url}/services/integration/api/order/v3/create-order"

    def create_shipment(self, payload):
        if not self.api_token:
            raise CourierBookingError("PostEx API token is not configured.")

        request_payload = {
            "orderRefNumber": payload["order_id"],
            "invoicePayment": payload["cod_amount"],
            "customerName": payload["customer_name"],
            "customerPhone": payload["customer_phone"],
            "deliveryAddress": payload["customer_address"],
            "cityName": payload["customer_city"],
            "items": payload["quantity"],
            "orderDetail": ", ".join(payload["product_names"]),
            "transactionNotes": payload["special_instructions"],
        }
        headers = {
            "Content-Type": "application/json",
            "token": self.api_token,
        }
        logger.info("PostEx request payload: %s", request_payload)
        try:
            response = requests.post(self.create_order_url, json=request_payload, headers=headers, timeout=20)
            try:
                response_data = response.json()
            except ValueError:
                response_data = {"raw": response.text}
        except requests.RequestException as exc:
            logger.exception("PostEx API request failed")
            raise CourierBookingError(str(exc), {"error": str(exc), "payload": request_payload}) from exc

        logger.info("PostEx response: %s", response_data)
        if response.status_code >= 400:
            raise CourierBookingError("PostEx API returned an error.", response_data)

        success = str(response_data.get("statusCode", "")).startswith("2") if isinstance(response_data, dict) else True
        if isinstance(response_data, dict) and response_data.get("statusCode") and not success:
            message = response_data.get("statusMessage") or response_data.get("message") or "PostEx API returned an error."
            raise CourierBookingError(str(message), response_data)

        tracking_number = _first_value(response_data, (
            "trackingNumber",
            "tracking_number",
            "trackingNo",
            "tracking_no",
            "consignmentNo",
            "cn_number",
        ))
        shipment_id = _first_value(response_data, (
            "shipmentId",
            "shipment_id",
            "orderId",
            "order_id",
            "id",
        ))
        if not tracking_number:
            raise CourierBookingError("PostEx API response did not include a tracking number.", response_data)
        return {
            "shipment_id": shipment_id or tracking_number,
            "tracking_number": tracking_number,
            "response": response_data,
        }


def _provider():
    provider = _env("COURIER_PROVIDER").lower()
    if provider == "postex":
        return PostExCourierProvider()
    raise CourierBookingError(
        f"Unsupported courier provider: {provider or '<missing>'}. Supported providers: postex"
    )


def _save_failure(order, provider_name, response):
    order.courier_company = provider_name
    order.courier_booking_status = "failed"
    order.courier_response = response
    order.save(update_fields=["courier_company", "courier_booking_status", "courier_response", "updated_at"])


def create_courier_shipment(order):
    with transaction.atomic():
        order = Order.objects.select_for_update().prefetch_related("items").get(pk=order.pk)
        if order.courier_tracking_number:
            raise CourierBookingError("Courier booking already exists.", {"error": "duplicate_booking"})
        if order.courier_booking_status == "booking":
            raise CourierBookingError("Courier booking is already in progress.", {"error": "booking_in_progress"})
        provider_name = _env("COURIER_PROVIDER").lower()
        order.courier_company = provider_name
        order.courier_booking_status = "booking"
        order.save(update_fields=["courier_company", "courier_booking_status", "updated_at"])

    try:
        provider = _provider()
        validate_courier_order(order)
        payload = _build_payload(order)
        logger.info("Courier request payload: %s", payload)
        result = provider.create_shipment(payload)
    except CourierBookingError as exc:
        logger.warning("Courier booking failed for order %s: %s", order.number, exc)
        _save_failure(order, _env("COURIER_PROVIDER").lower(), exc.response)
        raise
    except Exception as exc:
        logger.exception("Unexpected courier booking error for order %s", order.number)
        response = {"error": str(exc)}
        _save_failure(order, _env("COURIER_PROVIDER").lower(), response)
        raise CourierBookingError(str(exc), response) from exc

    with transaction.atomic():
        order = Order.objects.select_for_update().get(pk=order.pk)
        if order.courier_tracking_number:
            raise CourierBookingError("Courier booking already exists.", {"error": "duplicate_booking"})
        order.courier_company = provider.company
        order.courier_shipment_id = result["shipment_id"]
        order.courier_tracking_number = result["tracking_number"]
        order.courier_booking_status = "booked"
        order.courier_response = result["response"]
        order.courier_created_at = timezone.now()
        order.save(update_fields=[
            "courier_company",
            "courier_shipment_id",
            "courier_tracking_number",
            "courier_booking_status",
            "courier_response",
            "courier_created_at",
            "updated_at",
        ])
    return order
