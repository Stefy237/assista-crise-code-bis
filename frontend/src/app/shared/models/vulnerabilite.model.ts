/** Catalogue partagé des catégories de vulnérabilité -- librement extensible (voir
 * TypeVulnerabilite côté backend), même esprit que RisqueMajeurType/Competence. Description
 * fonctionnelle/opérationnelle uniquement -- jamais un diagnostic médical. */
export interface TypeVulnerabilite {
  id: string;
  nom: string;
  description: string;
  actif: boolean;
}

export type ModeConsentementVulnerabilite = 'VOLONTAIRE' | 'TIERS_AVEC_ACCORD' | 'TIERS_SANS_ACCORD_FORMEL';

/** Fiche du registre communal des personnes vulnérables (voir PersonneVulnerable côté backend)
 * -- donnée sensible, accès restreint à la RCSC/au RESPONSABLE de la mairie compétente ou à une
 * institution avec délégation de compétence active. */
export interface PersonneVulnerable {
  id: string;
  institution_declarante: string;
  institution_declarante_nom?: string;
  commune_code: string;
  zone?: string | null;
  zone_nom?: string | null;
  nom: string;
  prenom: string;
  adresse: string;
  telephone?: string | null;
  categorie_ids: string[];
  categories_detail?: TypeVulnerabilite[];
  contact_aidant_nom?: string | null;
  contact_aidant_telephone?: string | null;
  mode_consentement: ModeConsentementVulnerabilite;
  demandeur_consentement?: string;
  date_consentement?: string | null;
  actif: boolean;
  cree_par_nom?: string;
  date_creation: string;
  date_maj: string;
}
