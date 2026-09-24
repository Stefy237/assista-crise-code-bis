/** Fiche d'une personne mobilisée (24/09, bouton "Détail" depuis Ressources mobilisées) — voir
 * FicheIntervenantView côté backend. L'historique (audit) n'est pas inclus ici : voir
 * AuditLogService.forObject('User'|'Team', id), rappelé séparément par le composant. */
export interface FicheIntervenant {
  identite: {
    id: string;
    nom: string;
    prenom: string;
    email: string;
    telephone: string | null;
    type: string;
    type_libelle: string;
  };
  provenance: {
    type: 'portail' | 'institution' | 'inconnu';
    detail: string;
  };
  competences: {
    role_libelle: string;
    competence_nom: string | null;
    zone_nom: string | null;
    responsabilite: string | null;
    actif: boolean;
    depuis: string | null;
  }[];
  creneaux: {
    point_id: string;
    point_nom: string;
    date: string;
    creneau: string;
    creneau_libelle: string;
  }[];
  creneaux_aujourdhui: FicheIntervenant['creneaux'];
  affectations_points: {
    point_nom: string;
    statut: string;
    statut_libelle: string;
    date_attendue: string | null;
    date_reponse: string | null;
  }[];
  logement: { type: 'point' | 'offre'; nom: string; depuis: string } | null;
  engagement: { depuis: string | null; duree_jours: number | null };
}
