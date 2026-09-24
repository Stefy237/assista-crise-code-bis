import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { HabitationService, RattachementHabitationService } from '../../../services/habitation.service';
import { DocumentService } from '../../../services/document.service';
import { AuthService } from '../../../auth/services/auth.service';
import {
  Habitation, HabitationCommentaire, HabitationHistorique, RattachementHabitation,
  StatutEvaluationHabitation, StatutChantierHabitation,
  LABELS_STATUT_EVALUATION, LABELS_STATUT_CHANTIER,
} from '../../../shared/models/habitation.model';
import { DossierDocument } from '../../../shared/models/dossier-document.model';

type Onglet = 'details' | 'photos' | 'commentaires' | 'historique' | 'rattachement';

@Component({
  selector: 'app-habitation-fiche',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './habitation-fiche.component.html',
  styleUrl: './habitation-fiche.component.scss',
})
export class HabitationFicheComponent implements OnChanges {
  @Input({ required: true }) habitation!: Habitation;
  @Input() lectureSeule = false; // true pour la vue publique par magic-link (suivi d'un rattachement)
  @Output() fermer = new EventEmitter<void>();
  @Output() misAJour = new EventEmitter<Habitation>();

  onglet: Onglet = 'details';

  statutEvaluation: StatutEvaluationHabitation = 'NON_EVALUEE';
  statutChantier: StatutChantierHabitation = null;
  commentaireEvaluation = '';
  enregistrementEnCours = false;

  commentaires: HabitationCommentaire[] = [];
  nouveauCommentaire = '';

  historique: HabitationHistorique[] = [];

  rattachements: RattachementHabitation[] = [];

  photos: DossierDocument[] = [];
  photoUrls: Record<string, string> = {};
  fichierChoisi: File | null = null;

  // Formulaire de rattachement (visible quand l'utilisateur courant ne gère pas cette
  // habitation -- particulier/entreprise se réclamant propriétaire ou locataire, sans compte
  // obligatoire, voir RattachementHabitation.__doc__ côté backend).
  demandeEnvoyee = false;
  demandeEnCours = false;
  formRattachement = { nom_demandeur: '', email_demandeur: '', telephone_demandeur: '', type_lien: 'PROPRIETAIRE' as 'PROPRIETAIRE' | 'LOCATAIRE', message: '' };

  labelsEvaluation = LABELS_STATUT_EVALUATION;
  labelsChantier = LABELS_STATUT_CHANTIER;

  constructor(
    private habitationService: HabitationService,
    private rattachementService: RattachementHabitationService,
    private documentService: DocumentService,
    public authService: AuthService,
  ) {}

  ngOnChanges(): void {
    this.statutEvaluation = this.habitation.statut_evaluation;
    this.statutChantier = this.habitation.statut_chantier;
    this.chargerCommentaires();
    this.chargerHistorique();
    if (this.habitation.peut_gerer) this.chargerRattachements();
    this.chargerPhotos();
  }

  changerOnglet(o: Onglet): void {
    this.onglet = o;
  }

  get degatsConstates(): boolean {
    return this.statutEvaluation === 'DEGATS_FAIBLES' || this.statutEvaluation === 'DEGATS_FORTS';
  }

  enregistrerEvaluation(): void {
    this.enregistrementEnCours = true;
    this.habitationService.evaluer(
      this.habitation.id, this.statutEvaluation,
      this.degatsConstates ? this.statutChantier : null,
      this.commentaireEvaluation || undefined,
    ).subscribe({
      next: (h) => {
        this.enregistrementEnCours = false;
        this.commentaireEvaluation = '';
        this.misAJour.emit(h);
        this.chargerHistorique();
        this.chargerCommentaires();
      },
      error: () => { this.enregistrementEnCours = false; },
    });
  }

  private chargerCommentaires(): void {
    this.habitationService.getCommentaires(this.habitation.id).subscribe(c => this.commentaires = c);
  }

  envoyerCommentaire(): void {
    if (!this.nouveauCommentaire.trim()) return;
    this.habitationService.ajouterCommentaire(this.habitation.id, this.nouveauCommentaire).subscribe(() => {
      this.nouveauCommentaire = '';
      this.chargerCommentaires();
    });
  }

  private chargerHistorique(): void {
    this.habitationService.getHistorique(this.habitation.id).subscribe(h => this.historique = h);
  }

  private chargerRattachements(): void {
    this.rattachementService.getAll(this.habitation.id).subscribe(r => this.rattachements = r);
  }

  accepterRattachement(r: RattachementHabitation): void {
    this.rattachementService.accepter(r.id).subscribe(() => this.chargerRattachements());
  }

  refuserRattachement(r: RattachementHabitation): void {
    const motif = window.prompt('Motif du refus (optionnel) :') || undefined;
    this.rattachementService.refuser(r.id, motif).subscribe(() => this.chargerRattachements());
  }

  envoyerDemandeRattachement(): void {
    if (!this.formRattachement.nom_demandeur || !this.formRattachement.email_demandeur) return;
    this.demandeEnCours = true;
    this.rattachementService.demander({
      habitation: this.habitation.id,
      nom_demandeur: this.formRattachement.nom_demandeur,
      email_demandeur: this.formRattachement.email_demandeur,
      telephone_demandeur: this.formRattachement.telephone_demandeur || undefined,
      type_lien: this.formRattachement.type_lien,
      message: this.formRattachement.message || undefined,
    }).subscribe({
      next: () => { this.demandeEnCours = false; this.demandeEnvoyee = true; },
      error: () => { this.demandeEnCours = false; },
    });
  }

  private chargerPhotos(): void {
    this.documentService.getAll({ habitation: this.habitation.id }).subscribe(docs => {
      this.photos = docs;
      this.photos.forEach(p => {
        if (this.photoUrls[p.id]) return;
        this.documentService.preview(p.id).subscribe(blob => {
          this.photoUrls[p.id] = URL.createObjectURL(blob);
        });
      });
    });
  }

  onFichierChoisi(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.fichierChoisi = input.files?.[0] || null;
  }

  televerserPhoto(): void {
    if (!this.fichierChoisi) return;
    const form = new FormData();
    form.append('fichier', this.fichierChoisi);
    form.append('habitation', this.habitation.id);
    this.documentService.create(form).subscribe(() => {
      this.fichierChoisi = null;
      this.chargerPhotos();
    });
  }

  fermerFiche(): void {
    this.fermer.emit();
  }
}
