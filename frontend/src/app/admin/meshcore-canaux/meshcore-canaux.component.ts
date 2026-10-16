import { AfterViewChecked, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';

import { CanalMeshCoreService } from '../../services/canal-meshcore.service';
import { MessageMeshService } from '../../services/message-mesh.service';
import { NoeudMeshUtilisateurService } from '../../services/noeud-mesh-utilisateur.service';
import { CompagnonMeshCoreService } from '../../services/compagnon-meshcore.service';
import { ContactMeshCoreService } from '../../services/contact-meshcore.service';
import { CanalMeshCore, CanalMeshCoreDetecte, MessageCanalMeshCore, MessageMeshLog, StatutMessageMesh } from '../../shared/models/canal-meshcore.model';
import { NoeudMeshUtilisateur } from '../../shared/models/noeud-mesh-utilisateur.model';
import { ContactMeshCore } from '../../shared/models/contact-meshcore.model';

/** Cible d'un message privé, fusionnée depuis NoeudMeshUtilisateur (contact attribué à un
 * compte) ET ContactMeshCore (tout contact connu du companion, attribué ou non) -- voir
 * contactsPourDm. Un DM cible une pubkey, jamais un id de l'un ou l'autre modèle : les deux
 * APIs d'envoi/historique (MessageMeshLogViewSet) sont déjà purement indexées par pubkey_hex,
 * sans jamais exiger de NoeudMeshUtilisateur (demande utilisateur du 12/10 : pouvoir contacter
 * n'importe quel nœud connu, pas seulement ceux déjà attribués à un compte). */
interface CibleDm {
  pubkeyHex: string;
  titre: string;
  sousTitre?: string;
}

type Conversation =
  | { type: 'canal'; canal: CanalMeshCore }
  | { type: 'dm'; cible: CibleDm };

/** Chat MeshCore unifié : canaux d'équipe (coordination générale, un canal = une équipe, voir
 * TeamViewSet.provisionner_canal_meshcore) ET messages privés (DM, un fil par personne) dans
 * la même interface — sidebar de conversations + fil de discussion, comme un client de
 * messagerie classique (inspiré de github.com/Daring-Designs/meshtastic-ui-ha : sidebar de
 * conversations mêlant canaux et DM, indicateurs de statut d'envoi par message).
 *
 * Un canal d'équipe se crée depuis la fiche équipe (TeamsComponent, bouton "Créer le canal
 * MeshCore") — cette page ne fait que lister/discuter sur ceux qui existent déjà. Les DM,
 * eux, ciblent une personne précise parmi celles ayant un nœud MeshCore associé
 * (NoeudMeshUtilisateur) — jamais une équipe entière, pour éviter l'ambiguïté de routage
 * qu'avait l'ancien système (un message attribué à `expediteur.teams.first()`, arbitraire dès
 * qu'on appartient à plusieurs équipes). */
@Component({
  selector: 'app-meshcore-canaux',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './meshcore-canaux.component.html',
  styleUrl: './meshcore-canaux.component.scss',
})
export class MeshcoreCanauxComponent implements OnInit, OnDestroy, AfterViewChecked {

  @ViewChild('messagesContainer') messagesContainer?: ElementRef<HTMLDivElement>;
  /** Défilement en bas différé à l'après-rendu (voir ngAfterViewChecked) : le conteneur
   * `@ViewChild` n'existe pas encore tant que `loadingMessages` affiche le spinner à sa place. */
  private doitDefilerEnBas = false;

  canaux: CanalMeshCore[] = [];
  noeuds: NoeudMeshUtilisateur[] = [];
  /** Tout contact connu du companion (type COMPANION uniquement -- un répéteur/room server ne
   * se contacte pas en DM), attribué à un compte ou non -- voir contactsPourDm. */
  contacts: ContactMeshCore[] = [];
  compagnonPrincipalId: string | null = null;
  /** Canaux dont le companion capte le trafic radio sans les connaître localement (voir
   * CanalMeshCoreDetecte) -- lecture seule, pas de clé donc pas de fil de discussion. */
  canauxDetectes: CanalMeshCoreDetecte[] = [];

  conversationSelectionnee: Conversation | null = null;
  messagesCanal: MessageCanalMeshCore[] = [];
  messagesDm: MessageMeshLog[] = [];

  loadingSidebar = true;
  loadingMessages = false;
  errorMessage = '';

  nouveauMessage = '';
  envoiEnCours = false;

  /** Rejoindre un canal public existant (ex: "#meteo") -- clé dérivée automatiquement du nom
   * côté serveur (voir CanalMeshCoreSerializer.validate), jamais à saisir : c'est tout le
   * principe d'un canal public (demande utilisateur du 11/10). */
  nouveauCanalPublicNom = '';
  ajoutCanalEnCours = false;

  private intervalRafraichissement: ReturnType<typeof setInterval> | null = null;

  constructor(
    private canalService: CanalMeshCoreService,
    private dmService: MessageMeshService,
    private noeudService: NoeudMeshUtilisateurService,
    private compagnonService: CompagnonMeshCoreService,
    private contactService: ContactMeshCoreService,
  ) {}

  ngOnInit(): void {
    this.chargerSidebar();
    this.intervalRafraichissement = setInterval(() => {
      if (this.conversationSelectionnee) this.chargerMessages(this.conversationSelectionnee, false);
      this.chargerCanauxDetectes();
      this.rafraichirCanaux();
      this.rafraichirContacts();
    }, 8000);
  }

  /** Recharge juste la liste des canaux (équipe + publics) sans repasser par le spinner plein
   * écran de chargerSidebar -- un canal public rejoint depuis une autre page, ou auto-créé par
   * le pont (ex: canal "Public" par défaut, voir CanalMeshCore.SECRET_PUBLIC_PAR_DEFAUT),
   * n'apparaissait jamais dans la sidebar tant que la page n'était pas rechargée manuellement
   * (signalé par l'utilisateur le 11/10 : message reçu sur "#test" invisible jusqu'à F5). */
  private rafraichirCanaux(): void {
    this.canalService.getAll().subscribe({
      next: (canaux) => { this.canaux = canaux; },
      error: () => { /* non bloquant -- on retentera au prochain cycle */ },
    });
  }

  /** Même raison que rafraichirCanaux : un nouveau contact synchronisé par le pont (voir
   * boucle_contacts côté meshcore-bridge) doit apparaître dans "Messages privés" sans recharger
   * la page -- demande utilisateur du 12/10 (pouvoir contacter n'importe quel nœud connu). */
  private rafraichirContacts(): void {
    this.contactService.getAll().subscribe({
      next: (contacts) => { this.contacts = contacts.filter(c => c.type_contact === 'COMPANION'); },
      error: () => { /* non bloquant -- on retentera au prochain cycle */ },
    });
  }

  ngOnDestroy(): void {
    if (this.intervalRafraichissement) clearInterval(this.intervalRafraichissement);
  }

  ngAfterViewChecked(): void {
    if (this.doitDefilerEnBas && this.messagesContainer) {
      this.doitDefilerEnBas = false;
      this.defilerEnBas();
    }
  }

  private defilerEnBas(): void {
    const el = this.messagesContainer?.nativeElement;
    if (el) el.scrollTop = el.scrollHeight;
  }

  /** Vrai si l'utilisateur n'a pas remonté lire l'historique -- évite de l'arracher de sa
   * lecture à chaque rafraîchissement automatique (8s). */
  private estProcheDuBas(): boolean {
    const el = this.messagesContainer?.nativeElement;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  }

  chargerSidebar(): void {
    this.loadingSidebar = true;
    forkJoin({
      canaux: this.canalService.getAll(),
      noeuds: this.noeudService.getAll(),
      compagnons: this.compagnonService.getAll(),
      contacts: this.contactService.getAll(),
    }).subscribe({
      next: ({ canaux, noeuds, compagnons, contacts }) => {
        this.canaux = canaux;
        this.noeuds = noeuds.filter(n => n.actif);
        this.contacts = contacts.filter(c => c.type_contact === 'COMPANION');
        const principal = compagnons.find(c => c.principal) ?? compagnons[0];
        this.compagnonPrincipalId = principal?.id ?? null;
        this.loadingSidebar = false;
        this.chargerCanauxDetectes();
        if (!this.conversationSelectionnee && canaux.length > 0) {
          this.selectionnerCanal(canaux[0]);
        }
      },
      error: () => { this.errorMessage = 'Impossible de charger les conversations.'; this.loadingSidebar = false; },
    });
  }

  private chargerCanauxDetectes(): void {
    if (!this.compagnonPrincipalId) return;
    this.compagnonService.canauxDetectes(this.compagnonPrincipalId).subscribe({
      next: (data) => { this.canauxDetectes = data; },
      error: () => { /* non bloquant -- simple complément d'information */ },
    });
  }

  selectionnerCanal(canal: CanalMeshCore): void {
    this.conversationSelectionnee = { type: 'canal', canal };
    this.chargerMessages(this.conversationSelectionnee, true);
  }

  /** Fusionne NoeudMeshUtilisateur (compte attribué, nom prioritaire) et ContactMeshCore (tout
   * contact connu du companion) en une seule liste de cibles DM, dédupliquée par pubkey_hex --
   * un contact pas encore attribué à un compte reste joignable, juste sous son nom annoncé brut
   * plutôt que le nom d'un utilisateur (demande utilisateur du 12/10). */
  get contactsPourDm(): CibleDm[] {
    const parPubkey = new Map<string, CibleDm>();
    for (const n of this.noeuds) {
      parPubkey.set(n.pubkey_hex, {
        pubkeyHex: n.pubkey_hex,
        titre: n.nom_noeud || n.utilisateur_nom || 'Sans nom',
        sousTitre: (n.nom_noeud && n.utilisateur_nom) ? n.utilisateur_nom : undefined,
      });
    }
    for (const c of this.contacts) {
      if (!parPubkey.has(c.pubkey_hex)) {
        parPubkey.set(c.pubkey_hex, { pubkeyHex: c.pubkey_hex, titre: c.nom || c.pubkey_hex.slice(0, 10) });
      }
    }
    return Array.from(parPubkey.values()).sort((a, b) => a.titre.localeCompare(b.titre));
  }

  selectionnerDm(cible: CibleDm): void {
    this.conversationSelectionnee = { type: 'dm', cible };
    this.chargerMessages(this.conversationSelectionnee, true);
  }

  estConversationActive(conv: Conversation): boolean {
    if (!this.conversationSelectionnee) return false;
    if (conv.type === 'canal' && this.conversationSelectionnee.type === 'canal') {
      return conv.canal.id === this.conversationSelectionnee.canal.id;
    }
    if (conv.type === 'dm' && this.conversationSelectionnee.type === 'dm') {
      return conv.cible.pubkeyHex === this.conversationSelectionnee.cible.pubkeyHex;
    }
    return false;
  }

  chargerMessages(conv: Conversation, avecSpinner: boolean): void {
    if (avecSpinner) this.loadingMessages = true;
    // Changement de conversation : on force le défilement en bas. Rafraîchissement auto :
    // seulement si l'utilisateur n'a pas remonté lire l'historique.
    const procheDuBas = avecSpinner || this.estProcheDuBas();
    if (conv.type === 'canal') {
      this.canalService.getMessages(conv.canal.id).subscribe({
        next: (data) => {
          this.messagesCanal = data;
          if (avecSpinner) this.loadingMessages = false;
          if (procheDuBas) this.doitDefilerEnBas = true;
        },
        error: () => { if (avecSpinner) this.loadingMessages = false; },
      });
    } else {
      this.dmService.getPourContact(conv.cible.pubkeyHex).subscribe({
        next: (data) => {
          this.messagesDm = data;
          if (avecSpinner) this.loadingMessages = false;
          if (procheDuBas) this.doitDefilerEnBas = true;
        },
        error: () => { if (avecSpinner) this.loadingMessages = false; },
      });
    }
  }

  /** Canaux d'équipe (coordination privée, `equipe` renseigné) vs canaux publics (clé connue
   * de tous -- nom préfixé `#` rejoint manuellement, OU canal "Public" par défaut détecté et
   * ajouté automatiquement, voir CanalMeshCore.SECRET_PUBLIC_PAR_DEFAUT) -- deux usages
   * différents, affichés en deux sections séparées (demande utilisateur du 11/10), mais TOUS
   * les deux utilisables (fil de discussion complet), contrairement aux canaux détectés
   * ci-dessous (clé inconnue, donc rien à afficher ni rejoindre). */
  get canauxEquipe(): CanalMeshCore[] {
    return this.canaux.filter(c => !!c.equipe);
  }

  get canauxPublics(): CanalMeshCore[] {
    return this.canaux.filter(c => !c.equipe);
  }

  get messagesAffiches(): (MessageCanalMeshCore | MessageMeshLog)[] {
    if (!this.conversationSelectionnee) return [];
    return this.conversationSelectionnee.type === 'canal' ? this.messagesCanal : this.messagesDm;
  }

  envoyer(): void {
    const conv = this.conversationSelectionnee;
    if (!conv || !this.nouveauMessage.trim()) return;
    const contenu = this.nouveauMessage.trim();
    this.envoiEnCours = true;

    if (conv.type === 'canal') {
      this.canalService.envoyerMessage(conv.canal.id, contenu).subscribe({
        next: (message) => {
          this.messagesCanal = [...this.messagesCanal, message];
          this.nouveauMessage = '';
          this.envoiEnCours = false;
          this.doitDefilerEnBas = true;
        },
        error: () => { this.errorMessage = "Échec de l'envoi."; this.envoiEnCours = false; },
      });
    } else {
      if (!this.compagnonPrincipalId) {
        this.errorMessage = 'Aucun companion actif pour envoyer ce message.';
        this.envoiEnCours = false;
        return;
      }
      this.dmService.envoyer(this.compagnonPrincipalId, conv.cible.pubkeyHex, contenu).subscribe({
        next: (message) => {
          this.messagesDm = [...this.messagesDm, message];
          this.nouveauMessage = '';
          this.envoiEnCours = false;
          this.doitDefilerEnBas = true;
        },
        error: () => { this.errorMessage = "Échec de l'envoi."; this.envoiEnCours = false; },
      });
    }
  }

  ajouterCanalPublic(): void {
    let nom = this.nouveauCanalPublicNom.trim();
    if (!nom) return;
    if (!nom.startsWith('#')) nom = `#${nom}`;
    this.ajoutCanalEnCours = true;
    this.canalService.create({ nom }).subscribe({
      next: (canal) => {
        this.canaux = [...this.canaux, canal];
        this.nouveauCanalPublicNom = '';
        this.ajoutCanalEnCours = false;
        this.selectionnerCanal(canal);
        // Si le nom tapé correspond à du trafic déjà capté sous un chan_hash inconnu, le
        // backend vient de nettoyer la ligne fantôme correspondante (voir
        // CanalMeshCoreSerializer.validate) -- rafraîchir tout de suite plutôt que d'attendre
        // le prochain cycle de 8s, pour une confirmation visuelle immédiate.
        this.chargerCanauxDetectes();
      },
      error: () => { this.errorMessage = "Impossible de rejoindre ce canal public."; this.ajoutCanalEnCours = false; },
    });
  }

  // ── Affichage ─────────────────────────────────────────────────────────

  titreConversation(conv: Conversation): string {
    return conv.type === 'canal' ? conv.canal.nom : conv.cible.titre;
  }

  sousTitreConversation(conv: Conversation): string {
    if (conv.type === 'canal') {
      return conv.canal.equipe_nom ? `Canal d'équipe · ${conv.canal.equipe_nom}` : 'Canal public';
    }
    return 'Message privé';
  }

  auteurMessage(m: MessageCanalMeshCore | MessageMeshLog, conv: Conversation): string {
    if (m.direction === 'SORTANT') return m.expediteur_nom || 'Moi';
    if (conv.type === 'dm') return this.titreConversation(conv);
    return 'Mesh';
  }

  statutIcone(statut: StatutMessageMesh): string {
    return { EN_ATTENTE: 'schedule', ENVOYE: 'done', RECU: 'done_all', ECHEC: 'error_outline' }[statut];
  }

  statutClasse(statut: StatutMessageMesh): string {
    return { EN_ATTENTE: 'statut-attente', ENVOYE: 'statut-envoye', RECU: 'statut-recu', ECHEC: 'statut-echec' }[statut];
  }

  statutLibelle(statut: StatutMessageMesh): string {
    return { EN_ATTENTE: 'En attente d\'envoi', ENVOYE: 'Envoyé (accusé de réception reçu)', RECU: 'Reçu', ECHEC: 'Échec de l\'envoi' }[statut];
  }
}
