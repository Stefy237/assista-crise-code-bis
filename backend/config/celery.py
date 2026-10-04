"""App Celery -- utilisée pour l'instant uniquement par la simulation d'inondation (voir
core/tasks.py), dont le calcul (scan BAN + tests géométriques) peut dépasser largement le
timeout gunicorn sur une grande commune -- jamais exécutée en synchrone dans une requête HTTP."""
import os

from celery import Celery

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

app = Celery("assista_crise")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()
