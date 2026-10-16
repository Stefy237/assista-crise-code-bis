import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { PersonneVulnerableService } from '../../services/vulnerabilite.service';
import { PersonneVulnerable } from '../../shared/models/vulnerabilite.model';
import { PersonneVulnerableModalComponent } from './personne-vulnerable-modal/personne-vulnerable-modal.component';

/**
 * Registre communal des personnes vulnérables (recensement PCS, voir PersonneVulnerable côté
 * backend) — donnée sensible : accès déjà restreint côté serveur (RCSC/RESPONSABLE désigné de la
 * mairie, ou institution avec délégation de compétence active, voir core/vulnerabilites.py) ;
 * cette page n'ajoute pas de logique de permission propre, elle affiche ce que l'API accepte de
 * renvoyer à l'appelant. Catégories de vulnérabilité volontairement fonctionnelles/
 * opérationnelles uniquement (voir TypeVulnerabilite) -- jamais un diagnostic médical.
 */
@Component({
  selector: 'app-personnes-vulnerables',
  standalone: true,
  imports: [CommonModule, FormsModule, PersonneVulnerableModalComponent],
  templateUrl: './personnes-vulnerables.component.html',
  styleUrl: './personnes-vulnerables.component.scss',
})
export class PersonnesVulnerablesComponent implements OnInit {
  personnes: PersonneVulnerable[] = [];
  searchQuery = '';
  isLoading = true;
  errorMessage = '';

  modalOpen = false;
  editingPersonne: PersonneVulnerable | null = null;

  constructor(private personneVulnerableService: PersonneVulnerableService) {}

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.personneVulnerableService.getAll().subscribe({
      next: (personnes) => {
        this.personnes = personnes;
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Impossible de charger le registre des personnes vulnérables.';
        this.isLoading = false;
      },
    });
  }

  get filteredPersonnes(): PersonneVulnerable[] {
    const q = this.searchQuery.trim().toLowerCase();
    if (!q) return this.personnes;
    return this.personnes.filter(p =>
      `${p.nom} ${p.prenom} ${p.adresse}`.toLowerCase().includes(q)
    );
  }

  openCreateModal(): void {
    this.editingPersonne = null;
    this.modalOpen = true;
  }

  openEditModal(personne: PersonneVulnerable): void {
    this.editingPersonne = personne;
    this.modalOpen = true;
  }

  closeModal(): void {
    this.modalOpen = false;
    this.editingPersonne = null;
  }

  onSaved(): void {
    this.closeModal();
    this.load();
  }

  radierPersonne(personne: PersonneVulnerable, event: Event): void {
    event.stopPropagation();
    if (!confirm(`Radier la fiche de « ${personne.prenom} ${personne.nom} » du registre ?`)) return;
    this.personneVulnerableService.radier(personne.id).subscribe({
      next: () => this.load(),
      error: () => this.errorMessage = 'Impossible de radier cette fiche.',
    });
  }
}
