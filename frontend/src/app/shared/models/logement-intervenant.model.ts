/** "Besoin hébergement" (24/09) — voir LogementsDisponiblesView/AffecterLogementView côté
 * backend. Une entrée = soit un centre (PointOperationnel type Hébergement), soit une offre de
 * particulier validée pour l'accueil d'intervenants — jamais les deux. */
export interface LogementDisponible {
  type: 'point' | 'offre';
  id: string;
  nom: string;
  commune: string | null;
  capacite_adultes: number | null;
  capacite_enfants: number | null;
  distance_km: number | null;
}

export interface AffecterLogementPayload {
  intervenant_ids: string[];
  crise_id: string;
  point_id?: string;
  offre_id?: string;
}

export interface AffecterLogementResultat {
  type: 'point' | 'offre';
  id: string;
  nom: string;
  nombre_affectes: number;
}
