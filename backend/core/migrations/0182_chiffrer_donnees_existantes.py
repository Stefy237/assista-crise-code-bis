"""Chiffre les données déjà en base (voir core/crypto_fields.py et le plan "Chiffrement des
colonnes sensibles"). Avant cette migration, la 0181 a changé le TYPE des colonnes vers les
champs chiffrés mais les octets en base sont toujours du texte en clair -- la lecture via le
modèle historique fonctionne déjà (from_db_value retombe sur la valeur brute si le
déchiffrement Fernet échoue), ce qui permet de relire proprement puis de ré-écrire chiffré.

Important : le modèle "historique" fourni par apps.get_model() ne porte PAS les méthodes
personnalisées (save() de User/Request/Offer/Information/RattachementHabitation qui calculent
normalement le *_bidx) -- seuls les champs (donc le comportement Encrypted*Field) sont
préservés. Le calcul du bidx est donc refait explicitement ici avec la même fonction
(core.crypto_fields.blind_index) que le code applicatif, pas réimplémentée.
"""
from django.db import migrations
from django.db.migrations.exceptions import IrreversibleError

from core.crypto_fields import blind_index

BATCH = 500


def _resave_toutes_les_lignes(model):
    """Relit puis réécrit chaque ligne pour forcer get_prep_value (chiffrement) sur tous les
    champs Encrypted*Field du modèle. Pas de bidx à calculer pour ces modèles."""
    ids = list(model.objects.order_by("pk").values_list("pk", flat=True))
    for i in range(0, len(ids), BATCH):
        for obj in model.objects.filter(pk__in=ids[i:i + BATCH]):
            obj.save()


def _resave_avec_bidx(model, champ_email, champ_bidx):
    ids = list(model.objects.order_by("pk").values_list("pk", flat=True))
    for i in range(0, len(ids), BATCH):
        for obj in model.objects.filter(pk__in=ids[i:i + BATCH]):
            setattr(obj, champ_bidx, blind_index(getattr(obj, champ_email)))
            obj.save()


def chiffrer(apps, schema_editor):
    User = apps.get_model("core", "User")
    Request = apps.get_model("core", "Request")
    Information = apps.get_model("core", "Information")
    Offer = apps.get_model("core", "Offer")
    Habitation = apps.get_model("core", "Habitation")
    RattachementHabitation = apps.get_model("core", "RattachementHabitation")
    RecherchePersonne = apps.get_model("core", "RecherchePersonne")
    ContributionMateriel = apps.get_model("core", "ContributionMateriel")
    RegistrePresence = apps.get_model("core", "RegistrePresence")
    SuiviMaterielEvenement = apps.get_model("core", "SuiviMaterielEvenement")
    DeclarationSecurite = apps.get_model("core", "DeclarationSecurite")
    NoeudMeshUtilisateur = apps.get_model("core", "NoeudMeshUtilisateur")
    ContactMeshCore = apps.get_model("core", "ContactMeshCore")
    ContactMeshtastic = apps.get_model("core", "ContactMeshtastic")
    NoeudUtilisateurMeshtastic = apps.get_model("core", "NoeudUtilisateurMeshtastic")

    _resave_avec_bidx(User, "email", "email_bidx")
    _resave_avec_bidx(Request, "email_request", "email_request_bidx")
    _resave_avec_bidx(Information, "email_information", "email_information_bidx")
    _resave_avec_bidx(Offer, "email_offer", "email_offer_bidx")
    _resave_avec_bidx(RattachementHabitation, "email_demandeur", "email_demandeur_bidx")

    for model in (
        Habitation, RecherchePersonne, ContributionMateriel, RegistrePresence,
        SuiviMaterielEvenement, DeclarationSecurite, NoeudMeshUtilisateur,
        ContactMeshCore, ContactMeshtastic, NoeudUtilisateurMeshtastic,
    ):
        _resave_toutes_les_lignes(model)


def dechiffrer(apps, schema_editor):
    raise IrreversibleError(
        "Migration irréversible par conception (voir le plan) -- restaurer depuis la "
        "sauvegarde prise juste avant si besoin de revenir en arrière."
    )


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0181_information_email_information_bidx_and_more"),
    ]

    operations = [
        migrations.RunPython(chiffrer, dechiffrer),
    ]
