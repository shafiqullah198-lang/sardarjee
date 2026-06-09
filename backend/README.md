# Premium Shop Backend (Django + DRF)

## Quick Start

1. Create/activate Python venv.
2. Install deps:
   - `pip install -r requirements.txt`
3. Run migrations:
   - `python manage.py makemigrations`
   - `python manage.py migrate`
4. Create admin user:
   - `python manage.py createsuperuser`
5. Start server:
   - `python manage.py runserver`

## API Base

- Base URL: `/api/v1/`
- Auth:
  - `POST /auth/register/`
  - `POST /auth/login/`
  - `POST /auth/refresh/`
  - `GET/PATCH /auth/me/`
- Catalog:
  - `GET /categories/`
  - `GET /products/`
- Cart:
  - `GET /cart/`
  - `POST /cart/add/`
  - `POST /cart/update_item/`
  - `POST /cart/remove/`
- Checkout:
  - `POST /checkout/`
- Orders:
  - `GET /orders/`
  - `GET /orders/{id}/`
- CMS:
  - `GET /cms/home/`

## Frontend Integration Notes

- Keep React UI unchanged and fetch data from DRF endpoints.
- For guest cart, pass `X-Guest-Token` header from frontend local storage.
- Use JWT access token in `Authorization: Bearer <token>`.
