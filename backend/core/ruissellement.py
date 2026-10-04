"""Simulation grossière de ruissellement (crue éclair liée aux orages) par commune -- distincte
de inondation.py (crue de rivière, remplissage par connexité) : une crue éclair n'a pas de
"niveau d'eau absolu" à faire varier avec un curseur, elle se concentre dans les points bas et
talwegs selon le relief. Voir le plan de conception "Simulation de ruissellement" pour le détail
des compromis retenus.

Réutilise la MÊME grille d'altitude IGN que inondation.py (grille_altitude_commune) -- aucun
nouvel appel externe, juste un traitement différent (accumulation de flux plutôt que
remplissage par connexité). Toujours borné (grille plafonnée, voir inondation.py:MAX_COTE),
contrairement au chargement des adresses -- pas de risque de reproduire le bug Bordeaux ici
(pas de boucle géométrique coûteuse, juste un tri + une passe O(n) sur la grille).

IMPORTANT -- hypothèse volontairement neutre : chaque cellule de la grille reçoit 1 unité de
pluie (pas de vraie donnée de précipitation, pas d'intensité d'orage précise) -- l'accumulation
résultante est une mesure RELATIVE ("combien de cellules amont convergent ici"), pas un débit ou
une hauteur d'eau réelle. Voir le disclaimer affiché côté frontend."""
import numpy as np

# 8 directions D8 (décalage ligne, décalage colonne) -- ordre sans importance, parcourues
# exhaustivement pour chaque cellule.
_VOISINS_D8 = [(-1, -1), (-1, 0), (-1, 1), (0, -1), (0, 1), (1, -1), (1, 0), (1, 1)]


def _directions_ecoulement(altitude: np.ndarray) -> np.ndarray:
    """Pour chaque cellule, l'indice PLAT (ravel) de sa voisine D8 de plus basse altitude
    STRICTEMENT inférieure -- -1 si aucune voisine valide n'est plus basse (puits/minimum
    local, l'écoulement s'y arrête, voir docstring du module)."""
    ny, nx = altitude.shape
    directions = np.full(altitude.shape, -1, dtype=np.int64)

    for i in range(ny):
        for j in range(nx):
            if np.isnan(altitude[i, j]):
                continue
            meilleure_altitude = altitude[i, j]
            meilleur_indice = -1
            for di, dj in _VOISINS_D8:
                vi, vj = i + di, j + dj
                if vi < 0 or vi >= ny or vj < 0 or vj >= nx:
                    continue
                voisine = altitude[vi, vj]
                if np.isnan(voisine) or voisine >= meilleure_altitude:
                    continue
                meilleure_altitude = voisine
                meilleur_indice = vi * nx + vj
            directions[i, j] = meilleur_indice

    return directions


def _accumulation_depuis_directions(altitude: np.ndarray, directions: np.ndarray) -> np.ndarray:
    """Accumulation de flux : chaque cellule vaut 1 (sa propre pluie) + tout ce que ses voisines
    amont lui ont versé. Traiter les cellules par ALTITUDE DÉCROISSANTE garantit que toute
    cellule amont (plus haute par construction, voir _directions_ecoulement) est déjà traitée
    avant la cellule qui la reçoit -- pas besoin de graphe explicite ni de récursion."""
    ny, nx = altitude.shape
    altitude_plate = altitude.ravel()
    directions_plates = directions.ravel()
    accumulation = np.where(np.isnan(altitude_plate), np.nan, 1.0)

    ordre = np.argsort(np.where(np.isnan(altitude_plate), -np.inf, altitude_plate))[::-1]
    for indice in ordre:
        if np.isnan(altitude_plate[indice]):
            continue
        cible = directions_plates[indice]
        if cible != -1:
            accumulation[cible] += accumulation[indice]

    return accumulation.reshape(ny, nx)


def calculer_accumulation_flux(commune_code: str, pas_metres: int | None = None, forcer: bool = False, environment=None):
    """Grille de points enrichis d'une accumulation de flux relative -- mise en cache
    (GrilleRuissellementCommune), recalculée seulement si `forcer=True` (le relief ne change
    pas). Retourne `[]` si la grille d'altitude elle-même est indisponible (voir
    inondation.grille_altitude_commune)."""
    from .inondation import PAS_METRES_PAR_DEFAUT, _tableau_depuis_grille, grille_altitude_commune
    from .models import Environment, GrilleRuissellementCommune

    environment = environment or Environment.PROD
    pas_metres = pas_metres or PAS_METRES_PAR_DEFAUT

    if not forcer:
        existante = GrilleRuissellementCommune.objects.filter(commune_code=commune_code, environment=environment).first()
        if existante is not None:
            return existante.points

    points_altitude = grille_altitude_commune(commune_code, pas_metres=pas_metres, environment=environment)
    if not points_altitude:
        return []

    altitude, lons_uniques, lats_uniques = _tableau_depuis_grille(points_altitude)
    directions = _directions_ecoulement(altitude)
    accumulation = _accumulation_depuis_directions(altitude, directions)

    points = []
    for i, lat in enumerate(lats_uniques):
        for j, lon in enumerate(lons_uniques):
            valeur = accumulation[i, j]
            if not np.isnan(valeur):
                points.append({"lon": lon, "lat": lat, "accumulation": float(valeur)})

    GrilleRuissellementCommune.objects.update_or_create(
        commune_code=commune_code, environment=environment,
        defaults={"points": points, "pas_metres": pas_metres},
    )
    return points


def ruissellement_en_cache(commune_code: str, environment=None) -> dict | None:
    """Lit un résultat DÉJÀ calculé, sans déclencher aucun calcul -- None si pas encore en
    cache. Même patron que inondation.paliers_en_cache/adresses_en_cache."""
    from .models import Environment, GrilleRuissellementCommune

    environment = environment or Environment.PROD
    grille = GrilleRuissellementCommune.objects.filter(commune_code=commune_code, environment=environment).first()
    if grille is None:
        return None

    return {"commune_code": commune_code, "points": grille.points, "pas_metres": grille.pas_metres}
