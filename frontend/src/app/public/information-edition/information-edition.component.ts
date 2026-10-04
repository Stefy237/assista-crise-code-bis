import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

import { InformationEditionService } from '../../services/information-edition.service';
import { Information } from '../../shared/models/information.model';

/** Page publique atteinte via le lien reçu par email (Information.edition_token) — permet à
 * l'auteur d'un signalement (en général sans compte) de le consulter/modifier directement, sans
 * repasser par le formulaire complet. Édition volontairement minimale (texte du signalement
 * uniquement) : voir InformationPublicEditSerializer pour pourquoi azimuth/location/photo sont
 * hors scope ici. */
@Component({
  selector: 'app-information-edition',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './information-edition.component.html',
  styleUrl: './information-edition.component.scss',
})
export class InformationEditionComponent implements OnInit {
  loading = true;
  notFound = false;

  info: Information | null = null;

  editing = false;
  editForm: Partial<Information> = {};
  saving = false;
  saveError = '';
  saveSuccess = false;

  private token = '';

  constructor(
    private route: ActivatedRoute,
    private informationEditionService: InformationEditionService,
  ) {}

  ngOnInit(): void {
    this.token = this.route.snapshot.paramMap.get('token') || '';
    this.charger();
  }

  private charger(): void {
    this.loading = true;
    this.informationEditionService.getByToken(this.token).subscribe({
      next: (info) => { this.info = info; this.loading = false; },
      error: () => { this.notFound = true; this.loading = false; },
    });
  }

  startEditing(): void {
    if (!this.info) return;
    this.editForm = { title: this.info.title };
    this.editing = true;
    this.saveSuccess = false;
  }

  cancelEditing(): void {
    this.editing = false;
  }

  saveEdits(): void {
    this.saving = true;
    this.saveError = '';
    this.informationEditionService.update(this.token, this.editForm).subscribe({
      next: (info) => {
        this.info = info;
        this.saving = false;
        this.editing = false;
        this.saveSuccess = true;
      },
      error: () => { this.saveError = "Erreur lors de l'enregistrement."; this.saving = false; },
    });
  }
}
