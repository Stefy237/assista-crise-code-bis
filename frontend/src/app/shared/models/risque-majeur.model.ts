/** Catalogue partagé des types de risques majeurs -- librement extensible (voir
 * RisqueMajeurType côté backend), même esprit que Competence/MaterielCatalogue. */
export interface RisqueMajeurType {
  id: string;
  nom: string;
  generalites: string;
  actif: boolean;
}

/** Ce qu'une institution déclare à propos d'un risque majeur -- état des lieux et enjeux
 * propres à sa commune (voir RisqueCommunal côté backend). */
export interface RisqueCommunal {
  id: string;
  institution: string;
  institution_nom?: string;
  risque_type: string;
  risque_nom?: string;
  risque_generalites?: string;
  etat_des_lieux: string;
  enjeux: string;
  actif: boolean;
  date_maj?: string;
}

/** Piste de risque à déclarer, suggérée depuis l'API publique Géorisques (voir
 * geo_lookup.commune_risques côté backend, même source que la Vue Ma Collectivité) --
 * simple suggestion, jamais appliquée automatiquement. */
export interface SuggestionGeorisques {
  num_risque: string;
  libelle: string;
  deja_declare: boolean;
}
