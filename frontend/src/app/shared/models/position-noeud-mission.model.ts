/** Position actuelle d'un nœud MeshCore personnel — uniquement pour les nœuds d'utilisateurs
 * membres d'une équipe dont la mission courante est EN_COURS (voir
 * NoeudMeshUtilisateurViewSet.positions_en_mission côté backend). Jamais renvoyé en dehors
 * d'une mission active. */
export interface PositionNoeudMission {
  noeud_id: string;
  utilisateur_id: string;
  utilisateur_nom: string;
  nom_noeud: string;
  pubkey_hex: string;
  latitude: number;
  longitude: number;
  dernier_advert: string | null;
  equipe_id: string | null;
  equipe_nom: string | null;
  mission_id: string | null;
  mission_titre: string | null;
  /** Télémétrie captée en même temps que la position (même requête radio, voir
   * boucle_positions_missions côté pont) -- absente si le nœud n'a jamais répondu avec ces
   * canaux LPP. */
  tension_batterie_v: number | null;
  niveau_batterie_pct: number | null;
  derniere_telemetrie: string | null;
}
