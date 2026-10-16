from django.db import migrations

# Liste de départ pour le registre communal des personnes vulnérables (voir PersonneVulnerable) --
# même esprit que RISQUES dans 0197_seed_risques_majeurs_et_roles_pcs.py : point de départ, pas
# une liste exhaustive ni obligatoire, librement extensible (voir TypeVulnerabilite). Exigence
# RGPD actée avec Sylvain : description FONCTIONNELLE/OPÉRATIONNELLE uniquement, jamais un
# diagnostic médical.
TYPES_VULNERABILITE = [
    ("Mobilité réduite / ne peut évacuer seul·e",
     "Ne peut pas se déplacer seul·e jusqu'à un point de rassemblement ou un véhicule "
     "d'évacuation, quelle qu'en soit la cause."),
    ("Isolement social (vit seul·e, sans entourage proche)",
     "Aucun proche identifié à proximité susceptible de prévenir ou d'aider la personne en cas "
     "d'alerte."),
    ("Dépendance à un équipement électrique vital",
     "Le foyer dépend d'un équipement nécessitant une alimentation électrique continue pour la "
     "sécurité de la personne, sans précision de l'appareil ni de sa raison médicale."),
    ("Absence de moyen de communication autonome",
     "Ne dispose pas d'un moyen de recevoir une alerte ou de contacter les secours par "
     "elle-même (téléphone, internet...)."),
    ("Présence d'enfant(s) en bas âge au foyer",
     "Un ou plusieurs enfants en bas âge vivent au foyer, à prendre en compte dans "
     "l'organisation d'une évacuation."),
    ("Absence de moyen de transport personnel pour évacuer",
     "Ne dispose d'aucun véhicule ni moyen de transport personnel pour quitter les lieux en cas "
     "d'évacuation, et dépendra d'un moyen fourni par la commune/les secours."),
]

NOM_COMPETENCE = "Recensement personnes vulnérables"
DESCRIPTION_COMPETENCE = (
    "Permet une délégation explicite (DelegationCompetence) pour la tenue du registre communal "
    "des personnes vulnérables -- voir core/vulnerabilites.py."
)


def seed(apps, schema_editor):
    TypeVulnerabilite = apps.get_model("core", "TypeVulnerabilite")
    for nom, description in TYPES_VULNERABILITE:
        TypeVulnerabilite.objects.get_or_create(nom=nom, defaults={"description": description})

    Competence = apps.get_model("core", "Competence")
    Competence.objects.get_or_create(nom=NOM_COMPETENCE, defaults={"description": DESCRIPTION_COMPETENCE})


def remove(apps, schema_editor):
    TypeVulnerabilite = apps.get_model("core", "TypeVulnerabilite")
    TypeVulnerabilite.objects.filter(nom__in=[nom for nom, _ in TYPES_VULNERABILITE]).delete()
    Competence = apps.get_model("core", "Competence")
    Competence.objects.filter(nom=NOM_COMPETENCE).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0200_typevulnerabilite_team_est_equipe_rcsc_and_more"),
    ]

    operations = [
        migrations.RunPython(seed, remove),
    ]
