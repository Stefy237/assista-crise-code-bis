import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ImportApercu, ImportResultat, ImportService } from '../../services/import.service';

const CHAMPS = ['prenom', 'nom', 'email', 'telephone', 'role', 'responsabilite'] as const;
type Champ = typeof CHAMPS[number];

const LABELS: Record<Champ, string> = {
  prenom: 'Prénom',
  nom: 'Nom',
  email: 'Email',
  telephone: 'Téléphone',
  role: 'Rôle PCS (libellé exact déjà existant — voir l\'onglet « Rôles opérationnels »)',
  responsabilite: 'Titulaire ou Suppléant',
};

const CHAMPS_OBLIGATOIRES: Champ[] = ['nom', 'email'];

type Etape = 'selection' | 'correspondance' | 'resultat';

/** Import en masse des correspondants PCS (DOS/RAC/Correspondants COM/LOG/POP/SECU) -- même
 * gabarit que ImportInstitutionsComponent, voir imports.importer_correspondants_pcs côté
 * backend. Le rôle doit déjà exister (onglet « Rôles opérationnels ») -- jamais créé à la
 * volée depuis un import en masse. */
@Component({
  selector: 'app-import-correspondants-pcs',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './import-correspondants-pcs.component.html',
  styleUrls: ['./import-correspondants-pcs.component.scss'],
})
export class ImportCorrespondantsPCSComponent {
  readonly champs = CHAMPS;
  readonly labels = LABELS;
  readonly champsObligatoires = CHAMPS_OBLIGATOIRES;

  etape: Etape = 'selection';
  fichier: File | null = null;
  apercu: ImportApercu | null = null;
  mapping: Record<Champ, string> = { prenom: '', nom: '', email: '', telephone: '', role: '', responsabilite: '' };
  resultat: ImportResultat | null = null;

  isLoading = false;
  errorMessage = '';

  constructor(private importService: ImportService) {}

  telechargerExemple(): void {
    this.importService.telechargerExempleCorrespondantsPCS().subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'exemple-correspondants-pcs.csv';
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
    this.importService.importerCorrespondantsPCS(this.fichier, this.mapping).subscribe({
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
    this.mapping = { prenom: '', nom: '', email: '', telephone: '', role: '', responsabilite: '' };
  }
}
