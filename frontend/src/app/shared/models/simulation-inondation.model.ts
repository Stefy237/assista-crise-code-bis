import type { MultiPolygon, Polygon } from 'geojson';

export interface PalierInondation {
  niveau: number;
  /** null = rien d'inondé à ce niveau (relief entièrement hors d'eau, voir core/inondation.py). */
  polygone_geojson: Polygon | MultiPolygon | null;
}

export interface AdresseSimulee {
  adresse: string;
  lon: number;
  lat: number;
  altitude: number | null;
  /** Plus petit niveau d'eau simulé (mètres) qui atteint cette adresse -- null = jamais
   * atteinte dans la plage testée, pas "non calculée". */
  seuil_inondation: number | null;
}

export type StatutSimulationInondation = 'EN_COURS' | 'TERMINEE' | 'ECHEC';

/** Relief + paliers d'eau simulés pour une commune -- calcul TOUJOURS asynchrone côté serveur
 * (Celery), mais TOUJOURS borné (grille plafonnée) quelle que soit la taille de la commune.
 * `statut` seul renseigné tant que 'EN_COURS' ; les autres champs n'arrivent qu'à 'TERMINEE'.
 * Volontairement séparé des adresses (voir SimulationAdresses) : une grande ville peut avoir un
 * chargement d'adresses trop long/refusé sans que ça affecte cette simulation. */
export interface SimulationInondation {
  statut: StatutSimulationInondation;
  erreur?: string;
  commune_code?: string;
  niveaux?: number[];
  paliers?: PalierInondation[];
}

/** Adresses BAN d'une commune et leur seuil d'inondation simulé -- chargement TOUJOURS
 * déclenché explicitement par l'utilisateur (jamais automatique à la sélection d'une commune),
 * peut échouer clairement sur une très grande ville (voir core/inondation.py:SEUIL_VOIES_MAX)
 * sans affecter SimulationInondation. */
export interface SimulationAdresses {
  statut: StatutSimulationInondation;
  erreur?: string;
  commune_code?: string;
  adresses?: AdresseSimulee[];
}

export interface PointRuissellement {
  lon: number;
  lat: number;
  /** Valeur RELATIVE (nombre de cellules amont convergeant ici) -- pas un débit ou une hauteur
   * d'eau réelle, voir core/ruissellement.py. Une valeur élevée signale un axe d'écoulement
   * naturel (talweg), pas une prévision d'un épisode précis. */
  accumulation: number;
}

/** Grille d'accumulation de flux (ruissellement/crue éclair) d'une commune -- même grille
 * d'altitude que SimulationInondation, mais algorithme différent (pas de "niveau" à faire
 * varier). Toujours bornée comme SimulationInondation, jamais comme SimulationAdresses. */
export interface SimulationRuissellement {
  statut: StatutSimulationInondation;
  erreur?: string;
  commune_code?: string;
  points?: PointRuissellement[];
  /** Espacement réel (mètres) entre deux points de la grille -- nécessaire pour dessiner
   * chaque case à sa vraie taille géographique (voir simulation-inondation.component.ts). */
  pas_metres?: number;
}

/** Couleur de vigilance crues officielle (Vigicrues) du tronçon de cours d'eau surveillé le plus
 * proche de la commune -- donnée qualitative (prévisionnistes), DISTINCTE du niveau d'eau mesuré
 * (voir core/hydrometrie.py). */
export interface VigilanceCrue {
  troncon?: string;
  niveau?: number;
  libelle?: string;
  couleur?: string;
}

/** Dernier niveau d'eau RÉELLEMENT mesuré (Hub'Eau, station la plus proche de la commune) --
 * repère informatif à placer sur le curseur de SimulationInondation, MÊME référentiel NGF,
 * jamais une prévision ni une donnée pilotant la simulation (voir core/hydrometrie.py). */
export interface NiveauObserve {
  disponible: boolean;
  station?: string;
  cours_eau?: string;
  niveau_ngf?: number;
  date_observation?: string;
  vigilance?: VigilanceCrue;
}
