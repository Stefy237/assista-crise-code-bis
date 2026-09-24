import { Injectable } from '@angular/core';
import { PositionEquipeService } from './position-equipe.service';

const CLE_CONSENTEMENT = 'suiviPositionPermanentActif';
const INTERVALLE_ENVOI_MS = 2 * 60_000;

/** Suivi de position permanent d'un intervenant pendant sa mission, DÉCOUPLÉ de Matrix/du
 * salon d'équipe (demande explicite de Sylvain le 24/09 : "je viens de découvrir que la
 * position en continu [Element] c'est maxi 8h" -- Element plafonne son partage de position en
 * direct, et de toute façon la remontée ne doit pas dépendre du salon dans lequel se trouve
 * l'intervenant, ni de laquelle de ses équipes il change).
 *
 * L'accord de géolocalisation n'est demandé qu'UNE fois (`navigator.geolocation.watchPosition`
 * déclenche le prompt natif du navigateur la première fois seulement -- une fois la permission
 * "granted" au niveau de l'origine, tous les appels suivants, y compris à une session
 * ultérieure, démarrent silencieusement, sans nouvelle interaction). Le consentement est
 * mémorisé dans localStorage : `demarrerSiConsentement()` (appelé une fois au démarrage de
 * l'app, voir AppComponent) relance le suivi automatiquement tant que l'intervenant ne l'a pas
 * explicitement désactivé.
 *
 * Contrairement à GeolocationService.reportPositionIfInstitutional (capture opportuniste,
 * réservée aux acteurs institutionnels, jamais de traçage forcé), ce service EST un traçage
 * continu volontaire, ouvert à tout utilisateur connecté qui l'active lui-même -- changement de
 * doctrine assumé pour cette fonctionnalité précise, voir doc de conception "Matrix / Element".
 *
 * Limite connue : ne fonctionne que tant que l'onglet/l'app reste ouvert (pas de vrai service
 * en arrière-plan façon appli native) -- un navigateur mobile ralentit voire suspend
 * `watchPosition` si l'écran s'éteint longtemps ou si l'app est totalement fermée. */
@Injectable({ providedIn: 'root' })
export class SuiviPositionPermanentService {

  private watchId: number | null = null;
  private dernierEnvoiMs = 0;

  constructor(private positionEquipeService: PositionEquipeService) {}

  get actif(): boolean {
    return this.watchId !== null;
  }

  get consentementDonne(): boolean {
    return localStorage.getItem(CLE_CONSENTEMENT) === 'true';
  }

  demarrerSiConsentement(): void {
    if (this.consentementDonne) this.activer(false);
  }

  /** `premiereActivation` ne change rien au comportement du navigateur (c'est uniquement lui
   * qui décide de prompter ou non selon l'état de permission déjà connu) -- juste pour ne pas
   * réécrire le flag localStorage à chaque démarrage d'app silencieux. */
  activer(premiereActivation = true): void {
    if (this.actif || !navigator.geolocation) return;
    this.watchId = navigator.geolocation.watchPosition(
      (position) => this.surNouvellePosition(position),
      () => { /* refus ou position indisponible : on retentera à la prochaine session */ },
      { enableHighAccuracy: false, maximumAge: 60_000, timeout: 30_000 },
    );
    if (premiereActivation) localStorage.setItem(CLE_CONSENTEMENT, 'true');
  }

  desactiver(): void {
    if (this.watchId !== null) navigator.geolocation.clearWatch(this.watchId);
    this.watchId = null;
    localStorage.removeItem(CLE_CONSENTEMENT);
  }

  private surNouvellePosition(position: GeolocationPosition): void {
    const maintenant = Date.now();
    if (maintenant - this.dernierEnvoiMs < INTERVALLE_ENVOI_MS) return;
    this.dernierEnvoiMs = maintenant;
    this.positionEquipeService
      .reportMyPosition(position.coords.latitude, position.coords.longitude)
      .subscribe({ error: () => {} });
  }
}
