export type DirectionMessageMesh = 'ENTRANT' | 'SORTANT';
export type StatutMessageMesh = 'EN_ATTENTE' | 'ENVOYE' | 'RECU' | 'ECHEC';

export interface CanalMeshCore {
  id: string;
  nom: string;
  institution?: string | null;
  institution_nom?: string | null;
  crise?: string | null;
  crise_nom?: string | null;
  /** Non nul = canal privé d'UNE équipe (voir TeamViewSet.provisionner_canal_meshcore) —
   * répond au problème de routage des DM (un message de canal appartient sans ambiguïté à
   * l'équipe du canal, contrairement à un DM attribué via expediteur.teams.first()). */
  equipe?: string | null;
  equipe_nom?: string | null;
  /** write_only côté API — jamais renvoyée par le serveur, uniquement acceptée à la création. */
  cle_partagee_hex?: string;
  /** true = configuré localement sur le companion du pont (set_channel effectué), peut
   * effectivement envoyer/recevoir. false = clé générée mais pas encore provisionnée. */
  provisionne?: boolean;
  actif: boolean;
  date_creation?: string;
}

export interface MessageCanalMeshCore {
  id: string;
  canal: string;
  canal_nom?: string;
  direction: DirectionMessageMesh;
  expediteur?: string | null;
  expediteur_nom?: string | null;
  contact_pubkey_hex?: string | null;
  contenu: string;
  statut: StatutMessageMesh;
  erreur?: string | null;
  date_creation: string;
}

/** Canal dont un companion capte le trafic radio (paquet GRP_TXT, hash de clé toujours présent
 * sur l'air) sans le connaître localement — ancienne clé d'équipe encore utilisée par des
 * nœuds non à jour, ou canal tiers au voisinage radio. Indéchiffrable sans la clé : pas de fil
 * de discussion possible, juste un signalement de présence. */
export interface CanalMeshCoreDetecte {
  id: string;
  /** Hash de clé sur 1 octet (2 car. hex) tel que diffusé sur l'air. */
  chan_hash: string;
  premiere_vue: string;
  derniere_vue: string;
  nombre_paquets: number;
}

export interface MessageMeshLog {
  id: string;
  compagnon: string;
  compagnon_nom?: string;
  direction: DirectionMessageMesh;
  contact_pubkey_hex: string;
  expediteur?: string | null;
  expediteur_nom?: string | null;
  equipe?: string | null;
  equipe_nom?: string | null;
  contenu: string;
  statut: StatutMessageMesh;
  erreur?: string | null;
  date_creation: string;
  date_envoi?: string | null;
}
