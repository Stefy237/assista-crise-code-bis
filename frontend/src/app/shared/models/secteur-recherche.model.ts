import type { Polygon } from 'geojson';

export type StatutSecteurRecherche = 'A_FAIRE' | 'EN_COURS' | 'FOUILLE';

/** Secteur de recherche (méthode SAR) d'une RecherchePersonne -- découpe la zone de recherche
 * en polygones affectés chacun à une équipe, pour suivre ce qui a déjà été fouillé. Voir
 * SecteurRecherche côté backend. */
export interface SecteurRecherche {
  id: string;
  recherche_personne: string;
  nom: string;
  /** Envoyé en WKT à la création/mise à jour (voir ZoneMapComponent.zoneChange), reçu en
   * GeoJSON pour l'affichage (polygone_geojson). */
  polygone?: string;
  polygone_geojson: Polygon | null;
  equipe: string | null;
  equipe_nom?: string | null;
  statut: StatutSecteurRecherche;
  commentaire?: string | null;
  date_creation?: string;
  date_maj?: string;
}
