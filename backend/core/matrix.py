"""Correspondance User <-> identifiant Matrix, et petits calculs partagés par les vues et le
service-pont matrix-bridge (voir doc de conception "Matrix / Element" -- positionnement
permanent en mission + 1 salon privé par équipe, indépendant de MeshCore qui reste en place
pour son propre usage, voir CanalMeshCore).

Pas de table de correspondance stockée : le localpart Matrix est calculé de façon déterministe
à partir de l'UUID du User (`u` + hex sans tirets, seuls caractères autorisés par la spec
Matrix pour un localpart) -- Django et le pont recalculent la même valeur indépendamment,
aucune synchronisation à maintenir. Le même localpart est aussi exposé en claim OIDC
(`preferred_username`, voir core/oidc.py) pour que le provisioning JIT de Synapse à la
connexion SSO d'un utilisateur retombe exactement sur le compte déjà pré-provisionné par le
pont (voir matrix-bridge/bridge.py, assurer_compte_matrix)."""
import os
import uuid

MATRIX_SERVER_NAME = os.environ.get("MATRIX_SERVER_NAME", "matrix.assista-crise.local")


def matrix_localpart(user) -> str:
    return f"u{user.id.hex}"


def matrix_user_id(user) -> str:
    return f"@{matrix_localpart(user)}:{MATRIX_SERVER_NAME}"


def user_id_from_matrix_id(matrix_user_id_str: str):
    """Décode `@u<hex>:serveur` -> UUID du User, ou None si le format ne correspond pas
    (compte Matrix non géré par cette appli, ex: le bot du pont lui-même)."""
    if not matrix_user_id_str or not matrix_user_id_str.startswith("@"):
        return None
    localpart = matrix_user_id_str[1:].split(":", 1)[0]
    if not localpart.startswith("u") or len(localpart) != 33:
        return None
    try:
        return uuid.UUID(localpart[1:])
    except ValueError:
        return None
