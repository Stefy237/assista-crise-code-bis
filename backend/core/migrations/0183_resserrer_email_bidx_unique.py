"""Resserre `User.email_bidx` en unique=True une fois que la migration de données 0182 a
rempli cette colonne pour toutes les lignes existantes (voir le plan "Chiffrement des colonnes
sensibles" et le commentaire sur `User.email_bidx` dans models.py)."""
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0182_chiffrer_donnees_existantes"),
    ]

    operations = [
        migrations.AlterField(
            model_name="user",
            name="email_bidx",
            field=models.CharField(db_index=True, editable=False, max_length=64, unique=True),
        ),
    ]
