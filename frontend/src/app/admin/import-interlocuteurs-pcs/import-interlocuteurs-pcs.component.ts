import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ImportApercu, ImportResultat, ImportService } from '../../services/import.service';

const CHAMPS = ['nom', 'organisme', 'categorie', 'email', 'telephone', 'mode_alerte'] as const;
type Champ = typeof CHAMPS[number];

const LABELS: Record<Champ, string> = {
  nom: 'Nom du contact',
  organisme: 'Organisme (ex: Préfecture de la Gironde)',
  categorie: 'Catégorie (ex: Préfecture, Gendarmerie / Police, SDIS, ARS, Élu ou personnel communal...)',
  email: 'Email',
  telephone: 'Téléphone',
  mode_alerte: 'Mode d\'alerte (Email, Téléphone (manuel uniquement), Aucun envoi automatique)',
};

const CHAMPS_OBLIGATOIRES: Champ[] = ['nom'];

type Etape = 'selection' | 'correspondance' | 'resultat';

/** Import en masse de l'annuaire d'alerte PCS/PICS -- même gabarit que
 * ImportInstitutionsComponent, voir imports.importer_interlocuteurs_pcs côté backend. Un
 * contact déjà déclaré par une autre commune (même nom+organisme) est rattaché, jamais
 * dupliqué -- catalogue partagé, voir InterlocuteurAlertePCS. */
@Component({
  selector: 'app-import-interlocuteurs-pcs',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './import-interlocuteurs-pcs.component.html',
  styleUrls: ['./import-interlocuteurs-pcs.component.scss'],
})
export class ImportInterlocuteursPCSComponent {
  readonly champs = CHAMPS;
  readonly labels = LABELS;
  readonly champsObligatoires = CHAMPS_OBLIGATOIRES;

  etape: Etape = 'selection';
  fichier: File | null = null;
  apercu: ImportApercu | null = null;
  mapping: Record<Champ, string> = { nom: '', organisme: '', categorie: '', email: '', telephone: '', mode_alerte: '' };
  resultat: ImportResultat | null = null;

  isLoading = false;
  errorMessage = '';

  constructor(private importService: ImportService) {}

  telechargerExemple(): void {
    this.importService.telechargerExempleInterlocuteursPCS().subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'exemple-interlocuteurs-pcs.csv';
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
    return CHAMPS_OBLIGATOIRES.every(champ => !!this.mapping[champ]);
  }

  lancerImport(): void {
    if (!this.fichier || !this.mappingValide) return;
    this.isLoading = true;
    this.errorMessage = '';
    this.importService.importerInterlocuteursPCS(this.fichier, this.mapping).subscribe({
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
    this.mapping = { nom: '', organisme: '', categorie: '', email: '', telephone: '', mode_alerte: '' };
  }
}
