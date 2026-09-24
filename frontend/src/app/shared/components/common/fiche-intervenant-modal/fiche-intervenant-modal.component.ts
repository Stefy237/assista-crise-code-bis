import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { FicheIntervenantService } from '../../../../services/fiche-intervenant.service';
import { AuditLogService, AuditLogEntry } from '../../../../services/audit-log.service';
import { FicheIntervenant } from '../../../models/fiche-intervenant.model';

/** Fiche détaillée d'une personne mobilisée (24/09, bouton "Détail" depuis Ressources
 * mobilisées) : identité, provenance, compétences, créneaux/lieux travaillés, affectations sur
 * des points, logement, durée d'engagement -- voir FicheIntervenantView. L'historique
 * (compte + équipe) réutilise directement AuditLogService.forObject, déjà prévu comme "widget
 * d'historique par fiche" ailleurs dans l'appli, pas la peine de le refaire côté serveur. */
@Component({
  selector: 'app-fiche-intervenant-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './fiche-intervenant-modal.component.html',
  styleUrl: './fiche-intervenant-modal.component.scss',
})
export class FicheIntervenantModalComponent implements OnChanges {
  @Input({ required: true }) userId!: string;
  @Input() criseId: string | null = null;
  @Input() equipeId: string | null = null;
  @Input() equipeNom: string | null = null;

  @Output() closed = new EventEmitter<void>();

  fiche: FicheIntervenant | null = null;
  historiqueCompte: AuditLogEntry[] = [];
  historiqueEquipe: AuditLogEntry[] = [];
  chargement = true;
  erreur = '';

  constructor(
    private ficheService: FicheIntervenantService,
    private auditLogService: AuditLogService,
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['userId'] && this.userId) this.charger();
  }

  private charger(): void {
    this.chargement = true;
    this.erreur = '';
    forkJoin({
      fiche: this.ficheService.get(this.userId, this.criseId),
      historiqueCompte: this.auditLogService.forObject('User', this.userId).pipe(catchError(() => of([]))),
      historiqueEquipe: this.equipeId
        ? this.auditLogService.forObject('Team', this.equipeId).pipe(catchError(() => of([])))
        : of([]),
    }).subscribe({
      next: ({ fiche, historiqueCompte, historiqueEquipe }) => {
        this.fiche = fiche;
        this.historiqueCompte = historiqueCompte;
        this.historiqueEquipe = historiqueEquipe;
        this.chargement = false;
      },
      error: () => {
        this.erreur = "Impossible de charger la fiche de cette personne.";
        this.chargement = false;
      },
    });
  }
}
