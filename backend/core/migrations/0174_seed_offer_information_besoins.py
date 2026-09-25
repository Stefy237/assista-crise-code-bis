from django.db import migrations

# Cartographie par correspondance de nom (voir 0042_seed_besoins_categories.py pour le même
# principe côté RequestType) -- décidée avec l'utilisateur le 25/09 : "Bénévolat" et les deux
# types de test ("Matériel test", "Matériel (verif ress)") sont volontairement laissés sans
# Besoin (pas de thème à l'écoute pertinent), ils resteront simplement absents du sélecteur
# filtré des formulaires publics tant que personne ne les mappe explicitement.
OFFER_TYPE_VERS_BESOIN = {
    "Assistance immédiate": "Assistance immédiate",
    "Autre": "Autre",
    "Hébergement": "Hébergement",
    "Nourriture et eau": "Nourriture et eau",
    "Soins médicaux et paramédicaux": "Soins médicaux",
    "Soutien psychologique": "Soutien psychologique",
    "Transport": "Transport",
    "Matériel": "Matériel divers (à préciser)",
}

# InformationType n'a aucun Besoin équivalent existant (axe "signalement", pas "aide") --
# nouveaux Besoin créés ici, non qualifiés (nature=None), sauf "Autre" qui réutilise le Besoin
# générique déjà utilisé par RequestType/OfferType.
INFORMATION_TYPE_VERS_BESOIN = {
    "Autre": ("Autre", None),
    "Arbre sur la chaussée": ("Arbre sur la chaussée", "Arbre tombé ou menaçant de tomber sur une voie."),
    "Danger imminent": ("Danger imminent", "Situation représentant un danger immédiat à signaler."),
    "Information utile": ("Information utile", "Information générale utile à la gestion de la crise."),
    "Route barrée": ("Route barrée", "Voie coupée ou impraticable."),
}


def seed(apps, schema_editor):
    OfferType = apps.get_model("core", "OfferType")
    InformationType = apps.get_model("core", "InformationType")
    Besoin = apps.get_model("core", "Besoin")
    OfferTypeBesoin = apps.get_model("core", "OfferTypeBesoin")
    InformationTypeBesoin = apps.get_model("core", "InformationTypeBesoin")

    for type_nom, besoin_nom in OFFER_TYPE_VERS_BESOIN.items():
        offer_type = OfferType.objects.filter(type=type_nom).first()
        if offer_type is None:
            continue
        besoin, _ = Besoin.objects.get_or_create(nom=besoin_nom, defaults={"actif": True})
        OfferTypeBesoin.objects.get_or_create(offer_type=offer_type, besoin=besoin)

    for type_nom, (besoin_nom, description) in INFORMATION_TYPE_VERS_BESOIN.items():
        information_type = InformationType.objects.filter(type=type_nom).first()
        if information_type is None:
            continue
        besoin, _ = Besoin.objects.get_or_create(
            nom=besoin_nom, defaults={"description": description, "actif": True},
        )
        InformationTypeBesoin.objects.get_or_create(information_type=information_type, besoin=besoin)


def unseed(apps, schema_editor):
    OfferTypeBesoin = apps.get_model("core", "OfferTypeBesoin")
    InformationTypeBesoin = apps.get_model("core", "InformationTypeBesoin")
    OfferTypeBesoin.objects.filter(offer_type__type__in=OFFER_TYPE_VERS_BESOIN.keys()).delete()
    InformationTypeBesoin.objects.filter(information_type__type__in=INFORMATION_TYPE_VERS_BESOIN.keys()).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0173_informationtypebesoin_offertypebesoin'),
    ]

    operations = [
        migrations.RunPython(seed, unseed),
    ]
