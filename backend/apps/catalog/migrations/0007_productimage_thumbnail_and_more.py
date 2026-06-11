from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("catalog", "0006_product_show_in_fabrics_product_show_in_men_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="productimage",
            name="thumbnail",
            field=models.ImageField(blank=True, null=True, upload_to="products/thumbnails/"),
        ),
        migrations.AddIndex(
            model_name="category",
            index=models.Index(fields=["is_active"], name="catalog_cat_is_acti_7db955_idx"),
        ),
        migrations.AddIndex(
            model_name="category",
            index=models.Index(fields=["created_at"], name="catalog_cat_created_ab7416_idx"),
        ),
        migrations.AddIndex(
            model_name="product",
            index=models.Index(fields=["created_at"], name="catalog_pro_created_92b554_idx"),
        ),
        migrations.AddIndex(
            model_name="product",
            index=models.Index(fields=["status"], name="catalog_pro_status_521020_idx"),
        ),
        migrations.AddIndex(
            model_name="product",
            index=models.Index(fields=["category"], name="catalog_pro_categor_7c1c1f_idx"),
        ),
        migrations.AddIndex(
            model_name="product",
            index=models.Index(fields=["is_featured"], name="catalog_pro_is_feat_94b8d5_idx"),
        ),
        migrations.AddIndex(
            model_name="product",
            index=models.Index(fields=["is_trending"], name="catalog_pro_is_tren_1d0833_idx"),
        ),
        migrations.AddIndex(
            model_name="product",
            index=models.Index(fields=["is_new_arrival"], name="catalog_pro_is_new__45a366_idx"),
        ),
        migrations.AddIndex(
            model_name="productcolorvariant",
            index=models.Index(fields=["product"], name="catalog_pro_product_9712a3_idx"),
        ),
        migrations.AddIndex(
            model_name="productcolorvariant",
            index=models.Index(fields=["created_at"], name="catalog_pro_created_1f428c_idx"),
        ),
        migrations.AddIndex(
            model_name="productimage",
            index=models.Index(fields=["product", "sort_order"], name="catalog_pro_product_4ee3b8_idx"),
        ),
        migrations.AddIndex(
            model_name="productimage",
            index=models.Index(fields=["created_at"], name="catalog_pro_created_d592c1_idx"),
        ),
        migrations.AddIndex(
            model_name="productvariant",
            index=models.Index(fields=["product"], name="catalog_pro_product_460665_idx"),
        ),
        migrations.AddIndex(
            model_name="productvariant",
            index=models.Index(fields=["is_active"], name="catalog_pro_is_acti_ce92a3_idx"),
        ),
    ]
