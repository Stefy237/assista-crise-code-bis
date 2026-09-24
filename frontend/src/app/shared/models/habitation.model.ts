export type StatutEvaluationHabitation = 'NON_EVALUEE' | 'PAS_DE_DEGATS' | 'DEGATS_FAIBLES' | 'DEGATS_FORTS';
export type StatutChantierHabitation = 'A_DEBLAYER' | 'NETTOYAGE_EN_COURS' | 'TERMINE' | null;
export type TypeLienHabitation = 'PROPRIETAIRE' | 'LOCATAIRE';
export type StatutRattachementHabitation = 'EN_ATTENTE' | 'ACCEPTE' | 'REFUSE';

export interface Habitation {
  id: string;
  crise: string | null;
  zone: string | null;
  zone_nom: string | null;
  adresse: string;
  commune_code: string | null;
  commune_nom: string | null;
  latitude: number | null;
  longitude: number | null;
  parcelle_cadastrale: string | null;
  ban_id: string | null;
  statut_evaluation: StatutEvaluationHabitation;
  statut_chantier: StatutChantierHabitation;
  evalue_par: string | null;
  date_derniere_evaluation: string | null;
  date_creation: string;
  modifie_le: string;
  nb_rattachements_en_attente: number;
  peut_gerer: boolean;
}

export interface HabitationCommentaire {
  id: string;
  habitation: string;
  auteur: string | null;
  auteur_nom: string;
  commentaire: string;
  date_creation: string;
}

export interface HabitationHistorique {
  id: string;
  habitation: string;
  auteur: string | null;
  auteur_nom: string;
  evenement: string;
  commentaire: string | null;
  date_creation: string;
}

export interface RattachementHabitation {
  id: string;
  habitation: string;
  habitation_adresse: string;
  utilisateur: string | null;
  nom_demandeur: string;
  email_demandeur: string;
  telephone_demandeur: string | null;
  type_lien: TypeLienHabitation;
  statut: StatutRattachementHabitation;
  message: string | null;
  date_demande: string;
  traite_par: string | null;
  traite_par_nom: string | null;
  date_traitement: string | null;
  motif_refus: string | null;
}

export const LABELS_STATUT_EVALUATION: Record<StatutEvaluationHabitation, string> = {
  NON_EVALUEE: 'Non évaluée',
  PAS_DE_DEGATS: 'Pas de dégâts',
  DEGATS_FAIBLES: 'Dégâts faibles',
  DEGATS_FORTS: 'Dégâts forts',
};

export const LABELS_STATUT_CHANTIER: Record<string, string> = {
  A_DEBLAYER: 'À déblayer',
  NETTOYAGE_EN_COURS: 'Nettoyage / déblaiement en cours',
  TERMINE: 'Chantier terminé',
};

export const COULEURS_STATUT_EVALUATION: Record<StatutEvaluationHabitation, string> = {
  NON_EVALUEE: '#9ca3af',
  PAS_DE_DEGATS: '#22c55e',
  DEGATS_FAIBLES: '#f59e0b',
  DEGATS_FORTS: '#ef4444',
};
