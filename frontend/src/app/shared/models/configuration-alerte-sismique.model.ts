/** Réglages de diffusion automatique d'alertes sismiques sur les canaux mesh d'une institution
 * -- voir ConfigurationAlerteSismique côté backend. Source : catalogue sismique officiel
 * français (BCSF-Rénass/EOST, api.franceseisme.fr), vérifié toutes les 10 minutes par cron. */
export interface ConfigurationAlerteSismique {
  id: number;
  institution: string;
  institution_nom?: string | null;
  actif: boolean;
  rayon_km: number;
  magnitude_min: number;
  date_creation?: string;
}
