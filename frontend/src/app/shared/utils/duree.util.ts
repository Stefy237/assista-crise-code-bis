/** Affiche une durée écoulée depuis `date` sous forme compacte ("6h32", "1j 4h") -- utilisé pour
 * le compteur d'engagement d'équipe (Team.engagement_debut), sur les cartes équipe du panneau
 * Moyen (Cellule de crise) et dans l'entête équipe de Ressources mobilisées. `null` -> "Au repos". */
export function dureeDepuis(date: string | null | undefined): string {
  if (!date) return 'Au repos';
  const debut = new Date(date).getTime();
  const maintenant = Date.now();
  const minutesTotal = Math.max(0, Math.floor((maintenant - debut) / 60000));
  const jours = Math.floor(minutesTotal / 1440);
  const heures = Math.floor((minutesTotal % 1440) / 60);
  const minutes = minutesTotal % 60;
  if (jours > 0) return `${jours}j ${heures}h`;
  if (heures > 0) return `${heures}h${minutes.toString().padStart(2, '0')}`;
  return `${minutes} min`;
}
