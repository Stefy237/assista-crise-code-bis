#!/bin/sh
# L'image owasp/modsecurity-crs:nginx pré-crée access.log/error.log en tant que symlinks
# vers /dev/stdout/stderr, y compris sous le chemin custom qu'on donne via ACCESSLOG/
# ERRORLOG — pratique pour `docker logs`, mais ça empêche fail2ban de les lire comme de
# vrais fichiers depuis l'extérieur du conteneur. Monté en dernier (nom "99-") dans
# /docker-entrypoint.d/, ce script s'exécute juste avant le démarrage de nginx et
# remplace les symlinks par de vrais fichiers.
#
# PAS de `set -e` ici (incident du 2026-10-15) : ce script tourne dans le volume PERSISTANT
# waf_nginx_logs -- selon la version de l'image, docker-entrypoint.d s'exécute parfois en
# root, parfois en uid nginx (101). Un fichier déjà créé par une exécution précédente sous un
# autre UID que celui de l'exécution courante fait échouer `rm`/`chmod` en "Permission
# denied" -- avec `set -e`, ça faisait planter TOUT le conteneur en boucle de redémarrage (donc
# couper l'accès public au site entier) pour un problème de log, jamais pour une vraie raison
# de ne pas démarrer nginx. Chaque étape ci-dessous est maintenant best-effort : si le fichier
# existe déjà (peu importe son propriétaire), on le laisse tel quel plutôt que de bloquer le
# démarrage.
if [ -L /var/log/nginx-real/access.log ] || [ ! -e /var/log/nginx-real/access.log ]; then
    rm -f /var/log/nginx-real/access.log 2>/dev/null
    touch /var/log/nginx-real/access.log 2>/dev/null
    chmod 644 /var/log/nginx-real/access.log 2>/dev/null
fi
if [ -L /var/log/nginx-real/error.log ] || [ ! -e /var/log/nginx-real/error.log ]; then
    rm -f /var/log/nginx-real/error.log 2>/dev/null
    touch /var/log/nginx-real/error.log 2>/dev/null
    chmod 644 /var/log/nginx-real/error.log 2>/dev/null
fi
exit 0
