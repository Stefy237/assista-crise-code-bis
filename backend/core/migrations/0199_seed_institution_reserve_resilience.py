"""Crée l'institution "Réserve Résilience - Casques Jaunes" (premier partenaire marque blanche,
voir core/branding.py, plan "Marque blanche Réserve Résilience / Casques Jaunes") avec son
branding et ses deux hostnames (cj.assista-crise.fr, et app.reserve-resilience.org que le
partenaire pointe en CNAME dessus -- voir InstitutionWebDomaine). Couleurs/polices reprises de
l'analyse de leur site public reserve-resilience.org (WordPress/Divi) le 2026-10-13/14.

Pas de commune_code (portée nationale, pas une institution locale) : Institution.save() ne
dénormalise epci_code/departement_code/région/secteur que SI commune_code est renseigné --
laisser vide est donc sans effet indésirable, pas un cas particulier à gérer ici.

Pas de responsable attaché par cette migration (ContactInstitution/AffectationRoleOperationnel
RESPONSABLE) : étape manuelle une fois l'email du responsable réel communiqué (voir le plan,
"étape manuelle finale") -- cette migration ne fait que poser les fondations, jamais une
candidature de test ni un contact fictif."""
import os

from django.db import migrations


NOM = "Réserve Résilience - Casques Jaunes"
HOSTNAMES = ["cj.assista-crise.fr", "app.reserve-resilience.org"]
LOGO_PATH = os.path.join(os.path.dirname(__file__), "..", "fixtures", "branding", "reserve_resilience_logo.png")


def seed_institution(apps, schema_editor):
    Institution = apps.get_model("core", "Institution")
    InstitutionType = apps.get_model("core", "InstitutionType")
    InstitutionWebDomaine = apps.get_model("core", "InstitutionWebDomaine")

    if Institution.objects.filter(nom=NOM).exists():
        return

    type_aasc = InstitutionType.objects.filter(code="aasc").first()
    institution = Institution.objects.create(
        nom=NOM,
        nom_affichage=NOM,
        type=type_aasc,
        couleur_primaire="#3c4d81",
        couleur_secondaire="#2ea3f2",
        police_titre="Quicksand",
        police_texte="Open Sans",
        reserve_active=True,
        actif=True,
    )

    if os.path.exists(LOGO_PATH):
        with open(LOGO_PATH, "rb") as f:
            institution.logo.save("reserve_resilience_logo.png", f, save=True)

    for hostname in HOSTNAMES:
        InstitutionWebDomaine.objects.get_or_create(hostname=hostname, defaults={"institution": institution})


def remove_institution(apps, schema_editor):
    Institution = apps.get_model("core", "Institution")
    Institution.objects.filter(nom=NOM).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0198_branding_marque_blanche"),
    ]

    operations = [
        migrations.RunPython(seed_institution, remove_institution),
    ]
