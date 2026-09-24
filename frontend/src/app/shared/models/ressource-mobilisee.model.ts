export interface RessourceMobilisee {
  type: 'personne' | 'materiel';
  nom: string;
  equipe_id: string;
  equipe_nom: string;
  institution: string | null;
  crises: string[];
  centres: string[];
  detail: string | null;
  statut: string | null;
  /** Ids des crises de l'équipe (même ordre que `crises`) — "Besoin hébergement" (24/09) s'en
   * sert pour chercher les logements disponibles autour de la première crise de l'équipe. */
  crise_ids: string[];
  /** type === 'personne' uniquement. Logement actuellement réservé pour cette personne sur la
   * première crise de son équipe, null si aucun. */
  logement?: { type: 'point' | 'offre'; id: string; nom: string } | null;

  // type === 'personne' uniquement — corrèle avec proprietaire_id d'une ligne "materiel" pour
  // détecter qu'un membre d'équipe a lui-même apporté du matériel (couple indissociable).
  user_id?: string;

  // type === 'materiel' uniquement — voir TeamViewSet.ressources_mobilisees.
  proprietaire_nom?: string | null;
  proprietaire_id?: string | null;
  proprietaire_email?: string | null;
  proprietaire_telephone?: string | null;
  /** True = apporté ET exploité sur place (indissociable personne/matériel) ; false = déposé,
   * le propriétaire ne reste pas ; null/undefined = jamais renseigné (offre ancienne). */
  presence_physique?: boolean | null;
  /** Dépôt groupé (association/entreprise) — même groupe_id partagé par toutes les lignes
   * (personnes ET matériel) d'une même soumission. */
  organisation_nom?: string | null;
  groupe_id?: string | null;
  accompagne?: boolean | null;
  nombre_accompagnants?: number | null;
}
