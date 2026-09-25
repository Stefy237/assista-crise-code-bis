/** Réponse de GET /api/crises/<id>/cellule/ -- un seul appel au chargement de la page Cellule
 * de crise : provisionne la cellule (Team + salon Matrix) au passage côté backend et retourne
 * les compteurs qui alimentent les badges des 3 panneaux (ressource/moyen/coordination). */
export interface CelluleCrise {
  equipe_id: string;
  salon_room_id: string | null;
  salon_pret: boolean;
  compteurs: {
    dossiers_ressource_en_attente: number;
    dossiers_moyen_en_attente: number;
    dossiers_non_qualifies_en_attente: number;
    retours_externes_non_lus: number;
    institutions_acteur_en_attente: number;
  };
}
