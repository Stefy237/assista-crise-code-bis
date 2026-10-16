"""Handler de logging qui relaie les erreurs (niveau ERROR et au-dessus, voir LOGGING dans
config/settings.py) dans un salon Matrix dédié -- même esprit que AdminEmailHandler de Django
(mail_admins), pour qu'une erreur serveur ou un échec d'envoi d'email ne reste jamais
invisible. Ajouté après l'incident du 07/10 : un compte "Autorité locale" créé sans que
l'email d'activation ne parte jamais, sans aucune trace exploitable -- la config de logging
par défaut de Django n'attache un handler console qu'en DEBUG=True (require_debug_true), donc
tout logger.exception()/logger.error() en production (DEBUG=False) partait dans le vide."""
import logging
import os
import uuid

import requests

from .matrix import SYNAPSE_URL, _bot_headers

MATRIX_ALERT_ROOM_ID = os.environ.get("MATRIX_ALERT_ROOM_ID", "")

_MAX_BODY_LEN = 4000


class MatrixAlertHandler(logging.Handler):
    """Poste chaque enregistrement de log comme message texte dans MATRIX_ALERT_ROOM_ID. Ne
    doit JAMAIS lever d'exception vers l'appelant (contrat standard de logging.Handler) : un
    salon non configuré ou une panne du pont Matrix lui-même ne doit jamais faire planter le
    code qui a déclenché le log initial -- toute erreur ici passe par self.handleError,
    jamais propagée."""

    def emit(self, record):
        if not MATRIX_ALERT_ROOM_ID:
            return
        try:
            texte = self.format(record)
            if len(texte) > _MAX_BODY_LEN:
                texte = texte[:_MAX_BODY_LEN] + "\n… (tronqué)"
            txn_id = uuid.uuid4().hex
            requests.put(
                f"{SYNAPSE_URL}/_matrix/client/v3/rooms/{MATRIX_ALERT_ROOM_ID}/send/m.room.message/{txn_id}",
                headers=_bot_headers(),
                json={"msgtype": "m.text", "body": f"⚠️ {texte}"},
                timeout=10,
            )
        except Exception:
            self.handleError(record)
