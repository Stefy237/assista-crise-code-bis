export interface OfferMessage {
  id: string;
  offer: string;
  auteur_equipe: string | null;         // UUID de l'utilisateur côté équipe, null si envoyé par le propriétaire de l'offre
  auteur_equipe_nom?: string | null;
  contenu: string;
  date_creation: string;
  /** True dès la création si posé par l'équipe (déjà "lu"), false si posé par le propriétaire
   * de l'offre jusqu'à ce qu'un institutionnel ouvre le fil -- voir OfferViewSet.messages. */
  lu_par_institution: boolean;
}
