import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

import { FicheIntervenantService } from '../../../../services/fiche-intervenant.service';
import { FicheIntervenant } from '../../../models/fiche-intervenant.model';

/** Fiche détaillée d'une personne mobilisée (24/09, bouton "Détail" depuis Ressources
 * mobilisées) : identité, provenance, compétences, créneaux/lieux travaillés, affectations sur
 * des points, présence en centre, logement, durée d'engagement, PLUS deux historiques
 * distincts (précisé explicitement par Sylvain après une première version qui les confondait) :
 * "historique du compte" (sécurité — création, IP, reset mot de passe) et "activité" (tout ce
 * que la personne a fait sur la plateforme, consultations comprises) — voir
 * FicheIntervenantView, tout est renvoyé par un seul appel désormais. */
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
  chargement = true;
  erreur = '';

  constructor(private ficheService: FicheIntervenantService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['userId'] && this.userId) this.charger();
  }

  private charger(): void {
    this.chargement = true;
    this.erreur = '';
    this.ficheService.get(this.userId, this.criseId, this.equipeId).subscribe({
      next: (fiche) => { this.fiche = fiche; this.chargement = false; },
      error: () => { this.erreur = "Impossible de charger la fiche de cette personne."; this.chargement = false; },
    });
  }
}
