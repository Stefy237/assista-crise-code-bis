import { Injectable } from '@angular/core';
import { PositionEquipeService } from './position-equipe.service';

const CLE_DESACTIVATION = 'suiviPositionPermanentDesactive';
const INTERVALLE_ENVOI_MS = 2 * 60_000;

/** Suivi de position permanent d'un intervenant pendant sa mission, DÉCOUPLÉ de Matrix/du
 * salon d'équipe (demande explicite de Sylvain le 24/09 : "je viens de découvrir que la
 * position en continu [Element] c'est maxi 8h" -- Element plafonne son partage de position en
 * direct, et de toute façon la remontée ne doit pas dépendre du salon dans lequel se trouve
 * l'intervenant, ni de laquelle de ses équipes il change).
 *
 * Activé PAR DÉFAUT pour tout utilisateur connecté (demande explicite de Sylvain le 10/10) :
 * `demarrerSiConsentement()` (appelé au démarrage de l'app et après connexion, voir AppComponent
 * / AuthService) démarre le suivi automatiquement, SAUF si l'intervenant l'a lui-même désactivé
 * explicitement lors d'une session précédente (bouton toggle) -- seul ce refus explicite est
 * mémorisé dans localStorage désormais (inversion par rapport à l'ancien comportement opt-in,
 * qui mémorisait un accord à donner au premier clic). Le vrai garde-fou reste celui du
 * navigateur : `navigator.geolocation.watchPosition` déclenche de toute façon sa propre invite
 * native la toute première fois pour cet utilisateur sur cette origine -- aucun suivi silencieux
 * n'est possible sans qu'il ait lui-même cliqué "Autoriser" sur cette invite système, quel que
 * soit notre code ; une fois accordée, les démarrages suivants (y compris les sessions
 * ultérieures) sont silencieux.
 *
 * Contrairement à GeolocationService.reportPositionIfInstitutional (capture opportuniste,
 * réservée aux acteurs institutionnels, jamais de traçage forcé), ce service EST un traçage
 * continu, ouvert à tout utilisateur connecté -- changement de doctrine assumé pour cette
 * fonctionnalité précise, voir doc de conception "Matrix / Element".
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

  get desactiveExplicitement(): boolean {
    return localStorage.getItem(CLE_DESACTIVATION) === 'true';
  }

  /** Démarre le suivi par défaut, sauf désactivation explicite mémorisée -- voir doc de
   * classe. */
  demarrerSiConsentement(): void {
    if (!this.desactiveExplicitement) this.activer(false);
  }

  /** `demarrageManuel` : un clic explicite sur le toggle efface un refus mémorisé, sinon
   * demarrerSiConsentement() le redésactiverait à la prochaine session malgré ce clic. Ne
   * change rien au comportement du navigateur lui-même (lui seul décide de prompter ou non
   * selon l'état de permission déjà connu pour cette origine). */
  activer(demarrageManuel = true): void {
    if (this.actif || !navigator.geolocation) return;
    this.watchId = navigator.geolocation.watchPosition(
      (position) => this.surNouvellePosition(position),
      () => { /* refus ou position indisponible : on retentera à la prochaine session */ },
      { enableHighAccuracy: false, maximumAge: 60_000, timeout: 30_000 },
    );
    if (demarrageManuel) localStorage.removeItem(CLE_DESACTIVATION);
  }

  desactiver(): void {
    if (this.watchId !== null) navigator.geolocation.clearWatch(this.watchId);
    this.watchId = null;
    localStorage.setItem(CLE_DESACTIVATION, 'true');
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
