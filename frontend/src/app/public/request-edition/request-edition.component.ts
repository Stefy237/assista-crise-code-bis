import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

import { RequestEditionService } from '../../services/request-edition.service';
import { Request } from '../../shared/models/request.model';
import { TYPE_LOGEMENT_LABELS, TYPE_LOYER_LABELS } from '../../pages/hebergement-matching/hebergement-matching.component';

/** Page publique atteinte via le lien reçu par email (Request.edition_token) — permet à
 * l'auteur d'une demande (en général sans compte) de la consulter/modifier directement (compléter
 * une information, changer une disponibilité…), sans repasser par le formulaire complet. Même
 * patron qu'OfferReponseComponent, sans fil de messages (pas de messagerie pour les demandes). */
@Component({
  selector: 'app-request-edition',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './request-edition.component.html',
  styleUrl: './request-edition.component.scss',
})
export class RequestEditionComponent implements OnInit {
  loading = true;
  notFound = false;

  demande: Request | null = null;

  readonly typeLogementLabels = TYPE_LOGEMENT_LABELS;
  readonly typeLoyerLabels = TYPE_LOYER_LABELS;

  editing = false;
  editForm: Partial<Request> = {};
  saving = false;
  saveError = '';
  saveSuccess = false;

  private token = '';

  constructor(
    private route: ActivatedRoute,
    private requestEditionService: RequestEditionService,
  ) {}

  ngOnInit(): void {
    this.token = this.route.snapshot.paramMap.get('token') || '';
    this.charger();
  }

  private charger(): void {
    this.loading = true;
    this.requestEditionService.getByToken(this.token).subscribe({
      next: (demande) => { this.demande = demande; this.loading = false; },
      error: () => { this.notFound = true; this.loading = false; },
    });
  }

  /** Bloc hébergement affiché seulement si la demande en porte déjà au moins un champ --
   * heuristique simple (pas d'appel supplémentaire pour résoudre le libellé de request_type),
   * même esprit que le `type_loyer !== 'GRATUIT'` déjà utilisé côté Offer. */
  get estHebergement(): boolean {
    return !!(this.demande?.type_loyer || this.demande?.type_logement || this.demande?.hebergement_duree);
  }

  startEditing(): void {
    if (!this.demande) return;
    this.editForm = {
      description: this.demande.description,
      hebergement_duree: this.demande.hebergement_duree,
      type_logement: this.demande.type_logement,
      type_loyer: this.demande.type_loyer,
      loyer_montant_min: this.demande.loyer_montant_min,
      loyer_montant_max: this.demande.loyer_montant_max,
      nombre_pieces: this.demande.nombre_pieces,
      nombre_chambres: this.demande.nombre_chambres,
      capacite_adultes: this.demande.capacite_adultes,
      capacite_enfants: this.demande.capacite_enfants,
      animaux_acceptes: this.demande.animaux_acceptes,
      jardin: this.demande.jardin,
      pmr_compatible: this.demande.pmr_compatible,
      zone_recherche_rayon_km: this.demande.zone_recherche_rayon_km,
      nombre_places_assises: this.demande.nombre_places_assises,
    };
    this.editing = true;
    this.saveSuccess = false;
  }

  cancelEditing(): void {
    this.editing = false;
  }

  saveEdits(): void {
    this.saving = true;
    this.saveError = '';
    this.requestEditionService.update(this.token, this.editForm).subscribe({
      next: (demande) => {
        this.demande = demande;
        this.saving = false;
        this.editing = false;
        this.saveSuccess = true;
      },
      error: () => { this.saveError = "Erreur lors de l'enregistrement."; this.saving = false; },
    });
  }
}
