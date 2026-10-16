"""Chiffrement des colonnes sensibles au niveau applicatif (voir le plan de conception
"Chiffrement des colonnes sensibles") -- ni le disque, ni PostgreSQL, ni aucun champ n'étaient
chiffrés jusqu'ici (seuls les mots de passe le sont, via le hasher Django par défaut). Un accès
root/disque à la VM, ou un simple `pg_dump`/requête SQL directe hors Django, lisait tout en
clair malgré les données personnelles réelles traitées (demandeurs d'aide, bénévoles,
signalements, personnes recherchées, déclarations de sécurité).

Volontairement HORS PÉRIMÈTRE (voir le plan pour le détail des raisons) : tous les champs
géographiques (PostGIS a besoin de la géométrie brute pour ses requêtes spatiales -- un blob
chiffré casserait `.contains()`/`Distance()`/etc.), les `ImageField` (fichiers sur le volume
média, pas des colonnes texte), `AuditLog` (journal d'événements en texte/JSON libre,
structurellement différent), les champs organisationnels d'`Institution`.

Deux clés distinctes (jamais la même, pour ne pas mélanger les usages cryptographiques) :
`FIELD_ENCRYPTION_KEY` (Fernet, chiffrement réversible -- `EncryptedTextField`/
`EncryptedEmailField`/`EncryptedJSONField`) et `FIELD_BLIND_INDEX_KEY` (HMAC-SHA256,
irréversible -- `blind_index()`, pour les quelques champs email ayant besoin d'une recherche
EXACTE, ex: la connexion). Les deux sont lues depuis les variables d'environnement (voir
`config/settings.py`), jamais codées en dur, jamais commitées -- mêmes garanties que
SECRET_KEY/DB_PASS."""
import hashlib
import hmac
import json

from cryptography.fernet import Fernet, InvalidToken
from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
from django.core.validators import EmailValidator
from django.db import models

_fernet_instance = None


def _fernet() -> Fernet:
    global _fernet_instance
    if _fernet_instance is None:
        if not settings.FIELD_ENCRYPTION_KEY:
            raise ImproperlyConfigured(
                "FIELD_ENCRYPTION_KEY n'est pas configurée -- aucun champ chiffré ne peut être "
                "lu ni écrit sans elle. Voir ~/.config/assista-crise/secrets/backend.env."
            )
        _fernet_instance = Fernet(settings.FIELD_ENCRYPTION_KEY.encode())
    return _fernet_instance


def blind_index(valeur: str) -> str:
    """Empreinte déterministe et irréversible d'une valeur (normalisée -- espaces en bord et
    casse ignorés, pour qu'une recherche par email se comporte comme l'ancien `__iexact`),
    utilisée UNIQUEMENT pour permettre une recherche EXACTE sur un champ chiffré par ailleurs de
    façon non déterministe (Fernet inclut un nonce aléatoire -- deux lignes avec la même valeur
    en clair ont un ciphertext différent, l'égalité ne peut donc jamais se tester directement
    sur la colonne chiffrée). Ne sert JAMAIS à une recherche floue (`icontains`) : un index
    aveugle ne peut indexer qu'une correspondance exacte, jamais une sous-chaîne."""
    if not settings.FIELD_BLIND_INDEX_KEY:
        raise ImproperlyConfigured(
            "FIELD_BLIND_INDEX_KEY n'est pas configurée -- voir "
            "~/.config/assista-crise/secrets/backend.env."
        )
    normalise = (valeur or "").strip().lower()
    return hmac.new(
        settings.FIELD_BLIND_INDEX_KEY.encode(), normalise.encode(), hashlib.sha256
    ).hexdigest()


class EncryptedTextField(models.TextField):
    """Stocke le ciphertext Fernet (base64, longueur variable) dans une colonne `TEXT` -- pas
    de limite de longueur PostgreSQL à gérer contrairement à un `CharField` classique ; la
    validation de format/longueur du texte EN CLAIR reste faite par le serializer DRF existant,
    AVANT l'écriture en base, donc inchangée par ce champ. `from_db_value` tolère une valeur
    déjà en clair (non-chiffrée) : filet de sécurité pendant la fenêtre de migration, où les
    anciennes lignes pas encore re-chiffrées doivent rester lisibles sans planter."""

    def get_prep_value(self, value):
        if value is None or value == "":
            return value
        return _fernet().encrypt(str(value).encode()).decode()

    def from_db_value(self, value, expression, connection):
        if value is None or value == "":
            return value
        try:
            return _fernet().decrypt(value.encode()).decode()
        except InvalidToken:
            # Valeur en clair pré-migration (voir docstring) -- jamais le cas une fois la
            # migration de données terminée et vérifiée, mais mieux vaut afficher la valeur
            # brute que de faire une erreur 500 sur une ligne pas encore migrée.
            return value


class EncryptedEmailField(EncryptedTextField):
    """Identique à EncryptedTextField, conserve juste la validation de format email pour les
    formulaires/admin qui en dépendent (le serializer DRF applique déjà EmailField par ailleurs
    -- cette validation-ci ne sert qu'en repli, ex: admin Django direct)."""
    default_validators = [EmailValidator()]


class EncryptedJSONField(EncryptedTextField):
    """Pour un champ structuré (ex: DeclarationSecurite.ages_enfants, une liste d'âges
    d'enfants) : sérialise en JSON puis chiffre la chaîne résultante, inverse à la lecture.
    Expose un objet Python natif (liste/dict) comme un vrai JSONField, pas une chaîne JSON."""

    def get_prep_value(self, value):
        if value is None:
            return value
        return super().get_prep_value(json.dumps(value))

    def from_db_value(self, value, expression, connection):
        value = super().from_db_value(value, expression, connection)
        if value is None or value == "":
            return value
        try:
            return json.loads(value)
        except (TypeError, ValueError):
            # Même filet que la classe parente : une valeur pas encore migrée n'est pas du
            # JSON valide, on la renvoie telle quelle plutôt que de planter.
            return value
