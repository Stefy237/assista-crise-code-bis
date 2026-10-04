"""Données hydrométriques RÉELLEMENT observées (temps réel) pour une commune -- vient compléter
SimulationInondationView : la simulation elle-même reste une plage 0-12m calée sur la crue
historique de référence (1930, voir core/inondation.py), ce module situe où en est la rivière EN
CE MOMENT (repère informatif, pas une prévision).

Sources creusées le 2026-09-30 (demande explicite : "Creuse les 3 -- Vigicrues, Hub'Eau,
marées -- et utilise ce que tu peux") :
- Hub'Eau hydrométrie (https://hubeau.eaufrance.fr/api/v2/hydrometrie/) -- RETENU : gratuit, sans
  clé, mesures en temps quasi-réel (pas de 5 à 15 min). `referentiel/stations` donne les stations
  proches d'un point (triées par distance) avec leur `altitude_ref_alti_station` (le zéro NGF de
  l'échelle locale) ; `observations_tr` donne la dernière hauteur mesurée, en MILLIMÈTRES relatifs
  à ce zéro. Conversion : niveau_ngf = altitude_ref + resultat_obs/1000.
- Vigicrues (vigicrues.gouv.fr/services/) -- RETENU aussi, mais pour une donnée DIFFÉRENTE de
  Hub'Eau (pas redondante) : son flux `services/1/InfoVigiCru.geojson` (confirmé en direct le
  2026-09-30, 337 tronçons, sans clé) donne la COULEUR DE VIGILANCE officielle par tronçon de
  cours d'eau surveillé (`NivInfViCr`, 1=vert/2=jaune/3=orange/4=rouge -- échelle Météo-France
  standard), une donnée qualitative que Hub'Eau n'a pas du tout. Ses observations numériques
  temps réel (endpoint non documenté, services/observations.json/index.php), elles, donnent la
  MÊME grandeur que Hub'Eau (vérifié par recoupement le 2026-09-30 sur Cadillac : -1,31 m vs
  -1,284 m à la même minute) -- pas dupliquées ici, Hub'Eau suffit pour la hauteur numérique.
- Marées (api-maree.fr, SHOM/REFMAR) -- creusé, PAS intégré : api-maree.fr exige une inscription
  et une clé (pas d'usage anonyme) ; l'API REFMAR de data.shom.fr existe en accès libre mais sa
  documentation publique ne donne ni le tracé d'URL exact ni le format des stations sans
  inscription poussée. Les communes actuellement testées (Portets, Bordeaux, Montpellier, Le
  Porge) sont des cas de crue fluviale, pas d'estran -- la marée n'apporte rien tant qu'une
  commune réellement soumise à la marée n'est pas le cas d'usage concret. À reprendre si besoin
  réel identifié (voir commentaire, pas de code mort en attendant).

Hub'Eau et Vigicrues sont VOLONTAIREMENT indépendants l'un de l'autre (deux blocs try/échec
séparés) : l'absence de l'un n'empêche jamais l'autre de s'afficher, et aucun des deux ne bloque
jamais la simulation elle-même (fonctionnalité additive, voir docstring de niveau_observe_commune)."""
import math
import urllib.parse

from django.core.cache import cache

from .inondation import _bbox_commune, _fetch_json

_DISTANCE_RECHERCHE_KM = 20
_DUREE_CACHE_HUBEAU_SECONDES = 300  # temps réel -- pas la peine de rafraîchir plus souvent
_DUREE_CACHE_VIGILANCE_SECONDES = 900  # la couleur de vigilance change bien moins souvent qu'une hauteur d'eau

_URL_VIGICRUES_GEOJSON = "https://www.vigicrues.gouv.fr/services/1/InfoVigiCru.geojson"
# Au-delà, on considère qu'aucun tronçon surveillé n'est pertinent pour la commune (Vigicrues ne
# couvre que les cours d'eau sous surveillance état, pas tout le réseau hydrographique) -- environ
# 20km en latitude moyenne française, cohérent avec _DISTANCE_RECHERCHE_KM côté Hub'Eau.
_SEUIL_DISTANCE_VIGILANCE_DEGRES = 0.2
_LIBELLES_VIGILANCE = {1: "Vert", 2: "Jaune", 3: "Orange", 4: "Rouge"}
_COULEURS_VIGILANCE = {1: "#22c55e", 2: "#facc15", 3: "#f97316", 4: "#dc2626"}


def _centroide_commune(commune_code: str):
    bbox = _bbox_commune(commune_code)
    if bbox is None:
        return None
    lon_min, lat_min, lon_max, lat_max = bbox
    return (lon_min + lon_max) / 2, (lat_min + lat_max) / 2


def _station_hydrometrique_proche(lon: float, lat: float):
    """Station Hub'Eau la plus proche avec un repère NGF exploitable -- l'API trie déjà par
    distance croissante, on prend la première utilisable (en service, altitude de référence
    connue) plutôt que la première tout court (peut être une ancienne station fermée, voir
    exemple Cadillac 002 dans les résultats réels)."""
    url = (
        "https://hubeau.eaufrance.fr/api/v2/hydrometrie/referentiel/stations"
        f"?latitude={lat:.6f}&longitude={lon:.6f}&distance={_DISTANCE_RECHERCHE_KM}"
        "&format=json&size=10"
    )
    data = _fetch_json(url)
    if not data:
        return None
    for station in data.get("data", []):
        if station.get("en_service") and station.get("altitude_ref_alti_station") is not None:
            return station
    return None


def _derniere_hauteur(code_station: str):
    url = (
        "https://hubeau.eaufrance.fr/api/v2/hydrometrie/observations_tr"
        f"?code_entite={urllib.parse.quote(code_station)}&size=1&sort=desc"
    )
    data = _fetch_json(url)
    if not data:
        return None
    observations = data.get("data") or []
    return observations[0] if observations else None


def _niveau_observe_hubeau(lon: float, lat: float) -> dict | None:
    station = _station_hydrometrique_proche(lon, lat)
    if station is None:
        return None

    observation = _derniere_hauteur(station["code_station"])
    if observation is None or observation.get("resultat_obs") is None:
        return None

    niveau_ngf = station["altitude_ref_alti_station"] + observation["resultat_obs"] / 1000

    return {
        "station": station.get("libelle_station"),
        "cours_eau": station.get("libelle_cours_eau"),
        "niveau_ngf": round(niveau_ngf, 2),
        "date_observation": observation.get("date_obs"),
    }


def _troncons_vigicrues() -> list:
    """Flux complet des tronçons de vigilance crues (337 tronçons, ~2Mo) -- mis en cache en
    entier (pas un appel par commune) : trop volumineux et trop lent à retélécharger à chaque
    requête pour une donnée qui ne change que quelques fois par jour."""
    cle_cache = "vigicrues_troncons_geojson"
    troncons = cache.get(cle_cache)
    if troncons is not None:
        return troncons or []

    data = _fetch_json(_URL_VIGICRUES_GEOJSON)
    troncons = data.get("features", []) if data else []
    cache.set(cle_cache, troncons if troncons else False, _DUREE_CACHE_VIGILANCE_SECONDES)
    return troncons


def _vigilance_proche(lon: float, lat: float) -> dict | None:
    """Tronçon de vigilance crues le plus proche (distance au sommet de ligne le plus proche,
    approximation en degrés suffisante à l'échelle "quel tronçon est pertinent pour cette
    commune", voir docstring du module) -- None si aucun tronçon surveillé à proximité
    raisonnable (Vigicrues ne couvre qu'une partie du réseau hydrographique)."""
    meilleure_distance, meilleur_troncon = None, None
    for feature in _troncons_vigicrues():
        geometrie = feature.get("geometry") or {}
        lignes = geometrie.get("coordinates") or []
        if geometrie.get("type") != "MultiLineString":
            continue
        for ligne in lignes:
            for point_lon, point_lat in ligne:
                distance = math.hypot(point_lon - lon, point_lat - lat)
                if meilleure_distance is None or distance < meilleure_distance:
                    meilleure_distance, meilleur_troncon = distance, feature

    if meilleur_troncon is None or meilleure_distance > _SEUIL_DISTANCE_VIGILANCE_DEGRES:
        return None

    proprietes = meilleur_troncon["properties"]
    niveau = proprietes.get("NivInfViCr")
    return {
        "troncon": proprietes.get("lbentcru"),
        "niveau": niveau,
        "libelle": _LIBELLES_VIGILANCE.get(niveau, "Inconnu"),
        "couleur": _COULEURS_VIGILANCE.get(niveau, "#9ca3af"),
    }


def niveau_observe_commune(commune_code: str) -> dict | None:
    """Repères RÉELLEMENT observés (Hub'Eau + Vigicrues) le plus proches de la commune -- Hub'Eau
    en mètres NGF (MÊME référentiel que le curseur de SimulationInondationView), Vigicrues en
    couleur de vigilance officielle. Les deux sont indépendants (l'absence de l'un n'empêche
    jamais l'autre) ; None seulement si NI l'un NI l'autre n'a de donnée exploitable à proximité.
    Jamais d'exception remontée (même convention que inondation.py) -- fonctionnalité additive,
    une absence de donnée ne doit jamais bloquer la simulation elle-même."""
    cle_cache = f"niveau_observe_commune:{commune_code}"
    resultat = cache.get(cle_cache)
    if resultat is not None:
        return resultat or None

    resultat = _calculer_niveau_observe(commune_code)
    cache.set(cle_cache, resultat if resultat is not None else False, _DUREE_CACHE_HUBEAU_SECONDES)
    return resultat


def _calculer_niveau_observe(commune_code: str) -> dict | None:
    centroide = _centroide_commune(commune_code)
    if centroide is None:
        return None
    lon, lat = centroide

    hubeau = _niveau_observe_hubeau(lon, lat)
    vigilance = _vigilance_proche(lon, lat)
    if hubeau is None and vigilance is None:
        return None

    resultat = dict(hubeau) if hubeau else {}
    if vigilance:
        resultat["vigilance"] = vigilance
    return resultat
