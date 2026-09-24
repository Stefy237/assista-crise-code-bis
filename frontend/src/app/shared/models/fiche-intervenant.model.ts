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
  presences_centre: {
    point_nom: string;
    date_arrivee: string;
    date_depart: string | null;
  }[];
  logement: { type: 'point' | 'offre'; nom: string; depuis: string } | null;
  engagement: { depuis: string | null; duree_jours: number | null };
  /** Voir FicheIntervenantView : "événements de sécurité" (création, IP, reset mot de passe). */
  historique_compte: HistoriqueEntry[];
  /** Tout ce que CETTE personne a fait sur la plateforme (consultations comprises, via
   * AuditTraceMiddleware) — pas filtré par crise, volontairement (voir docstring backend). */
  historique_activite: HistoriqueEntry[];
  /** Best-effort : événements de l'équipe mentionnant cette personne par son nom complet (ex:
   * "ajouté(e)"/"retiré(e)") — l'action est faite par quelqu'un d'autre, absente de
   * historique_activite qui ne trace que les actions de la personne elle-même. */
  historique_equipe_evenements: HistoriqueEntry[];
}

export interface HistoriqueEntry {
  date: string;
  action_code: string;
  action_libelle: string | null;
  objet_type: string;
  objet_id: string | null;
  commentaire: string | null;
  adresse_ip: string | null;
  succes: boolean;
}
