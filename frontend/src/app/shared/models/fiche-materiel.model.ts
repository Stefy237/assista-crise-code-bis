/** Suivi d'état/maintenance et fiche détaillée d'une offre de matériel (24/09, pendant matériel
 * de la fiche intervenant) — voir FicheMaterielView / SuiviMaterielEvenement côté backend. */
export type EtatMateriel = 'DISPONIBLE' | 'INDISPONIBLE' | 'EN_REPARATION' | 'HORS_SERVICE';

export interface SuiviMaterielEvenement {
  id: string;
  offre: string;
  etat: EtatMateriel;
  etat_libelle: string;
  commentaire: string | null;
  reparateur_nom: string | null;
  reparateur_contact: string | null;
  lieu_reparation: string | null;
  date_reparation: string | null;
  cout_reparation: number | null;
  cree_par_nom?: string | null;
  date_creation: string;
}

export interface SuiviMaterielEvenementPayload {
  offre: string;
  etat: EtatMateriel;
  commentaire?: string;
  reparateur_nom?: string;
  reparateur_contact?: string;
  lieu_reparation?: string;
  date_reparation?: string;
  cout_reparation?: number;
}

export interface FicheMateriel {
  identite: {
    id: string;
    titre: string;
    description: string | null;
    materiel_type: string | null;
    materiel_catalogue_nom: string | null;
    quantite: number | null;
    unite: string | null;
    immatriculation: string | null;
    nombre_places_assises: number | null;
    has_photo: boolean;
    status: string;
    status_libelle: string;
    actif: boolean;
  };
  proprietaire: {
    nom: string;
    email: string | null;
    telephone: string | null;
  };
  etat_actuel: SuiviMaterielEvenement | null;
  evenements: SuiviMaterielEvenement[];
  historique_activite: {
    date: string;
    action_code: string;
    action_libelle: string | null;
    commentaire: string | null;
    succes: boolean;
  }[];
}
