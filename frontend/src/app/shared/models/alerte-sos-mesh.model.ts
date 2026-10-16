export type ProtocoleMesh = 'MESHCORE' | 'MESHTASTIC';

/** Message mesh entrant détecté comme une possible urgence (mot-clé SOS/urgence, ou canal
 * nommé par convention communautaire pour les communications d'urgence, ex: "Fr_EMCOM") --
 * voir AlerteMeshSOS côté backend. Réservé aux administrateurs (ce sont eux qui sont notifiés
 * en direct par email + Element, cette liste n'est qu'un complément d'historique). */
export interface AlerteMeshSOS {
  id: string;
  protocole: ProtocoleMesh;
  institution?: string | null;
  institution_nom?: string | null;
  canal_nom: string | null;
  expediteur_identifiant: string | null;
  expediteur_nom: string;
  contenu: string;
  mot_cle_detecte: string;
  notification_envoyee: boolean;
  date_creation: string;
}
