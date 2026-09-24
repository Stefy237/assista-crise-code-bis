import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { LogementIntervenantService } from '../../../../services/logement-intervenant.service';
import { LogementDisponible, AffecterLogementResultat } from '../../../models/logement-intervenant.model';

/** "Besoin hébergement" (24/09, vue Ressources mobilisées) — liste les centres/offres de
 * particuliers disponibles autour d'une crise, triés par distance, et affecte le choix à un ou
 * plusieurs intervenants d'un coup (sélection groupée : "1 asso avec 50 intervenants, tous au
 * même endroit"). Utilisé aussi bien pour une seule personne (intervenantIds à un élément) que
 * pour une sélection multiple — le composant ne fait aucune distinction entre les deux cas. */
@Component({
  selector: 'app-logement-picker-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './logement-picker-modal.component.html',
  styleUrl: './logement-picker-modal.component.scss',
})
export class LogementPickerModalComponent implements OnChanges {
  @Input({ required: true }) criseId!: string;
  @Input({ required: true }) intervenantIds: string[] = [];

  @Output() affecte = new EventEmitter<AffecterLogementResultat>();
  @Output() closed = new EventEmitter<void>();

  logements: LogementDisponible[] = [];
  chargement = true;
  erreur = '';
  affectationEnCours = false;

  constructor(private logementService: LogementIntervenantService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['criseId'] && this.criseId) this.charger();
  }

  private charger(): void {
    this.chargement = true;
    this.erreur = '';
    this.logementService.getDisponibles(this.criseId).subscribe({
      next: (logements) => { this.logements = logements; this.chargement = false; },
      error: () => { this.erreur = 'Impossible de charger les logements disponibles.'; this.chargement = false; },
    });
  }

  choisir(logement: LogementDisponible): void {
    if (!this.intervenantIds.length) return;
    this.affectationEnCours = true;
    this.logementService.affecter({
      intervenant_ids: this.intervenantIds,
      crise_id: this.criseId,
      point_id: logement.type === 'point' ? logement.id : undefined,
      offre_id: logement.type === 'offre' ? logement.id : undefined,
    }).subscribe({
      next: (resultat) => { this.affectationEnCours = false; this.affecte.emit(resultat); },
      error: () => { this.affectationEnCours = false; this.erreur = "Échec de l'affectation."; },
    });
  }
}
