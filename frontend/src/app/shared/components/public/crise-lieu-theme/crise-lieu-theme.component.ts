import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { CrisisService } from '../../../../services/crisis.service';
import { Crisis } from '../../../models/crisis.model';
import { AddressPickerComponent } from '../../common/address-picker/address-picker.component';
import { AddressResult } from '../../../models/address-result.model';
import { TypesALecouteService } from '../../../../services/types-a-lecoute.service';
import { AxeTypeALecoute } from '../../../models/type-a-lecoute.model';
import { Besoin } from '../../../models/besoin.model';

/** Première étape, commune aux 3 formulaires publics de dépôt (offre/demande/signalement) :
 * crise obligatoire, puis lieu (adresse, préremplie par géolocalisation) — et SEULEMENT une
 * fois les deux connus, la liste des thèmes qu'au moins une institution écoute pour cette
 * crise/zone (voir TypesALecouteView côté backend). Émet `typesAutorises` (ids du catalogue de
 * l'axe demandé) pour que le formulaire parent filtre son propre sélecteur de type — ce
 * composant ne connaît rien du reste du formulaire, volontairement minimal et réutilisable. */
@Component({
  selector: 'app-crise-lieu-theme',
  standalone: true,
  imports: [CommonModule, FormsModule, AddressPickerComponent],
  templateUrl: './crise-lieu-theme.component.html',
  styleUrl: './crise-lieu-theme.component.scss',
})
export class CriseLieuThemeComponent implements OnInit {
  @Input({ required: true }) axe!: AxeTypeALecoute;
  @Output() criseSelectionnee = new EventEmitter<Crisis | null>();
  @Output() adresseSelectionnee = new EventEmitter<AddressResult | null>();
  @Output() typesAutorises = new EventEmitter<string[]>();

  crises: Crisis[] = [];
  criseId = '';

  adresse: AddressResult | null = null;

  chargementThemes = false;
  besoins: Besoin[] = [];
  private appele = false;

  constructor(
    private crisisService: CrisisService,
    private typesALecouteService: TypesALecouteService,
  ) {}

  ngOnInit(): void {
    this.crisisService.getAll().subscribe({
      next: (crises) => { this.crises = crises.filter(c => c.is_open !== false); },
      error: () => {},
    });
  }

  get crise(): Crisis | null {
    return this.crises.find(c => c.id === this.criseId) || null;
  }

  onCriseChange(): void {
    this.criseSelectionnee.emit(this.crise);
    this.rechargerThemes();
  }

  onAdresseSelectionnee(addr: AddressResult | null): void {
    this.adresse = addr;
    this.adresseSelectionnee.emit(addr);
    this.rechargerThemes();
  }

  private rechargerThemes(): void {
    this.besoins = [];
    this.typesAutorises.emit([]);
    this.appele = false;

    if (!this.criseId || !this.adresse?.citycode) return;

    this.chargementThemes = true;
    this.typesALecouteService.get(this.criseId, this.adresse.citycode, this.axe).subscribe({
      next: (res) => {
        this.chargementThemes = false;
        this.appele = true;
        this.besoins = res.besoins;
        this.typesAutorises.emit(res.type_ids);
      },
      error: () => { this.chargementThemes = false; this.appele = true; },
    });
  }

  get aucunTheme(): boolean {
    return this.appele && !this.chargementThemes && this.besoins.length === 0;
  }
}
