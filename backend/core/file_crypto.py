"""Chiffrement au repos pour les FICHIERS sensibles (contrairement à core/crypto_fields.py, qui
chiffre des colonnes texte mais exclut explicitement les ImageField/FileField -- voir son
docstring). Jusqu'ici aucun fichier du volume média n'était chiffré : un accès direct au volume
Docker/disque du serveur donnait les fichiers en clair, protection reposant uniquement sur le
contrôle d'accès applicatif (voir proxy/nginx.conf, blocage des préfixes documents/photos/
recherches). Introduit pour PieceIdentiteReserve (photo de permis de conduire, exigence
assurance d'un partenaire marque blanche) -- plus sensible qu'une photo de profil.

Clé dédiée `FILE_ENCRYPTION_KEY` (voir config/settings.py), jamais la même que
`FIELD_ENCRYPTION_KEY`/`FIELD_BLIND_INDEX_KEY`, même principe de ne pas mélanger les usages
cryptographiques déjà suivi par crypto_fields.py."""
from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
from django.core.files.base import ContentFile
from django.core.files.storage import FileSystemStorage

from cryptography.fernet import Fernet

_fernet_instance = None


def _fernet() -> Fernet:
    global _fernet_instance
    if _fernet_instance is None:
        if not settings.FILE_ENCRYPTION_KEY:
            raise ImproperlyConfigured(
                "FILE_ENCRYPTION_KEY n'est pas configurée -- aucun fichier chiffré ne peut être "
                "lu ni écrit sans elle. Voir ~/.config/assista-crise/secrets/backend.env."
            )
        _fernet_instance = Fernet(settings.FILE_ENCRYPTION_KEY.encode())
    return _fernet_instance


class EncryptedFileSystemStorage(FileSystemStorage):
    """Storage Django transparent : chiffre à l'écriture, déchiffre à la lecture -- le reste du
    code (FieldFile.open()/.read(), FileResponse sur un objet ouvert via ce storage) ne voit
    jamais le ciphertext. Générique, réutilisable pour tout futur champ sensible, pas spécifique
    au permis de conduire.

    IMPORTANT : ne déchiffre QUE via `FieldFile.open()`/`field.storage.open(name)` -- un accès
    disque direct (`open(field.path, "rb")`, voir le patron UserViewSet.preview pour une photo
    NON chiffrée) renverrait le ciphertext brut. Toute action de téléchargement sur un champ
    utilisant ce storage doit passer par `field.open("rb")`, jamais par `field.path`."""

    def _save(self, name, content):
        content.seek(0)
        chiffre = _fernet().encrypt(content.read())
        return super()._save(name, ContentFile(chiffre))

    def _open(self, name, mode="rb"):
        fichier = super()._open(name, mode)
        try:
            clair = _fernet().decrypt(fichier.read())
        finally:
            fichier.close()
        return ContentFile(clair, name=name)


_storage_instance = None


def get_encrypted_file_storage():
    """Callable (pas une instance directe) passée à `FileField(storage=...)` -- Django a besoin
    d'une référence sérialisable dans les migrations (même raisonnement que les fonctions
    `upload_to` nommées au niveau module dans models.py, voir leurs docstrings), une instance de
    classe ne l'est pas."""
    global _storage_instance
    if _storage_instance is None:
        _storage_instance = EncryptedFileSystemStorage()
    return _storage_instance
