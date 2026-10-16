export type TypeContactMeshCore = 'INCONNU' | 'COMPANION' | 'REPEATER' | 'ROOM' | 'SENSOR';

export interface ContactMeshCore {
  id: string;
  compagnon: string;
  compagnon_nom?: string;
  pubkey_hex: string;
  nom: string;
  type_contact: TypeContactMeshCore;
  latitude?: number | null;
  longitude?: number | null;
  dernier_advert?: string | null;
  /** Nombre de sauts du chemin connu par CE companion vers ce contact — null si aucun chemin
   * confirmé (sentinel firmware 255, PAS "255 sauts"). Voir ContactMeshCore.nombre_sauts. */
  nombre_sauts?: number | null;
  /** Étiquette régionale posée à la main, voir CompagnonMeshCore.region_tag. */
  region_tag?: string;
  /** Télémétrie (canaux LPP "voltage"/"percentage"), captée uniquement pendant une mission
   * EN_COURS -- voir ContactMeshCore.tension_batterie_v. */
  tension_batterie_v?: number | null;
  niveau_batterie_pct?: number | null;
  derniere_telemetrie?: string | null;
  date_synchronisation?: string;
  deja_associe: boolean;
}

export type StatutTraceroute = 'EN_ATTENTE' | 'TERMINE' | 'ECHEC';

export interface SautTraceroute {
  hash?: string;
  snr: number;
}

/** Diagnostic réseau MeshCore : chemin radio suivi par un paquet de trace en diffusion --
 * voir TracerouteMeshCore côté backend. */
export interface TracerouteMeshCore {
  id: string;
  compagnon: string;
  compagnon_nom?: string;
  tag: number | null;
  statut: StatutTraceroute;
  chemin: SautTraceroute[] | null;
  erreur: string | null;
  date_creation: string;
  date_reponse: string | null;
}
