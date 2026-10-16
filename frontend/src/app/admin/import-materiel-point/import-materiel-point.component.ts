import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ImportApercu, ImportResultat, ImportService } from '../../services/import.service';

const CHAMPS = ['nom_item', 'niveau_stock', 'quantite', 'unite', 'commentaire'] as const;
type Champ = typeof CHAMPS[number];

const LABELS: Record<Champ, string> = {
  nom_item: 'Nom du matériel (ex: Tatamis, Lits de camp, Couvertures...)',
  niveau_stock: 'Niveau de stock (Nul, Faible, OK, En trop)',
  quantite: 'Quantité',
  unite: 'Unité (ex: unité, kg, L...)',
  commentaire: 'Précision (ex: utilisable comme lit d\'urgence)',
};

const CHAMPS_OBLIGATOIRES: Champ[] = ['nom_item'];

type Etape = 'selection' | 'correspondance' | 'resultat';

/** Import en masse du matériel d'UN point opérationnel précis (reçu en query param `?point=`,
 * jamais une colonne du fichier -- voir imports.importer_materiel_point côté backend). Même
 * gabarit que ImportInstitutionsComponent, atteint depuis le bouton "Importer" de la modale
 * Besoins & stocks d'un point (point-inventaire-modal). */
@Component({
  selector: 'app-import-materiel-point',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './import-materiel-point.component.html',
  styleUrls: ['./import-materiel-point.component.scss'],
})
export class ImportMaterielPointComponent implements OnInit {
  readonly champs = CHAMPS;
  readonly labels = LABELS;
  readonly champsObligatoires = CHAMPS_OBLIGATOIRES;

  pointId: string | null = null;

  etape: Etape = 'selection';
  fichier: File | null = null;
  apercu: ImportApercu | null = null;
  mapping: Record<Champ, string> = { nom_item: '', niveau_stock: '', quantite: '', unite: '', commentaire: '' };
  resultat: ImportResultat | null = null;

  isLoading = false;
  errorMessage = '';

  constructor(private importService: ImportService, private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.pointId = this.route.snapshot.queryParamMap.get('point');
    if (!this.pointId) {
      this.errorMessage = "Aucun point opérationnel sélectionné — revenez à la fiche du centre et cliquez de nouveau sur « Importer ».";
    }
  }

  telechargerExemple(): void {
    this.importService.telechargerExempleMaterielPoint().subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'exemple-materiel-point.csv';
        a.click();
        URL.revokeObjectURL(url);
      },
      error: () => { this.errorMessage = "Impossible de télécharger le fichier d'exemple."; },
    });
  }

  onFichierChoisi(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.fichier = input.files?.[0] ?? null;
  }

  analyserFichier(): void {
    if (!this.fichier) return;
    this.isLoading = true;
    this.errorMessage = '';
    this.importService.apercu(this.fichier).subscribe({
      next: (apercu) => {
        this.apercu = apercu;
        this.preselectionnerColonnes();
        this.etape = 'correspondance';
        this.isLoading = false;
      },
      error: (err) => {
        this.errorMessage = err?.error?.error || 'Impossible de lire ce fichier.';
        this.isLoading = false;
      },
    });
  }

  private preselectionnerColonnes(): void {
    if (!this.apercu) return;
    const normalise = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    for (const champ of CHAMPS) {
      const trouve = this.apercu.colonnes.find(c => normalise(c).includes(normalise(champ)));
      if (trouve) this.mapping[champ] = trouve;
    }
  }

  get mappingValide(): boolean {
    return !!this.pointId && CHAMPS_OBLIGATOIRES.every(champ => !!this.mapping[champ]);
  }

  lancerImport(): void {
    if (!this.fichier || !this.pointId || !this.mappingValide) return;
    this.isLoading = true;
    this.errorMessage = '';
    this.importService.importerMaterielPoint(this.fichier, this.pointId, this.mapping).subscribe({
      next: (resultat) => {
        this.resultat = resultat;
        this.etape = 'resultat';
        this.isLoading = false;
      },
      error: (err) => {
        this.errorMessage = err?.error?.error || "Erreur lors de l'import.";
        this.isLoading = false;
      },
    });
  }

  recommencer(): void {
    this.etape = 'selection';
    this.fichier = null;
    this.apercu = null;
    this.resultat = null;
    this.errorMessage = '';
    this.mapping = { nom_item: '', niveau_stock: '', quantite: '', unite: '', commentaire: '' };
  }
}
