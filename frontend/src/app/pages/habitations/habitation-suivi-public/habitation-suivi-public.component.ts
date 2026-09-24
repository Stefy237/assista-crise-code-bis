import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';

import { HabitationFicheComponent } from '../habitation-fiche/habitation-fiche.component';
import { HabitationService } from '../../../services/habitation.service';
import { Habitation } from '../../../shared/models/habitation.model';

/** Page atteinte via le magic-link envoyé après acceptation d'un rattachement (voir
 * RattachementHabitationViewSet._traiter) — même principe que dossier-suivi : l'utilisateur est
 * déjà authentifié à ce stade (MagicLoginComponent a consommé le lien avant la redirection
 * next_url), donc un simple appel API suffit ici, filtré côté serveur par
 * HabitationCommentaireViewSet/DocumentViewSet sur le rattachement ACCEPTE de l'utilisateur. */
@Component({
  selector: 'app-habitation-suivi-public',
  standalone: true,
  imports: [CommonModule, RouterModule, HabitationFicheComponent],
  templateUrl: './habitation-suivi-public.component.html',
  styleUrl: './habitation-suivi-public.component.scss',
})
export class HabitationSuiviPublicComponent implements OnInit {
  habitation: Habitation | null = null;
  erreur = false;

  constructor(private route: ActivatedRoute, private habitationService: HabitationService) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) { this.erreur = true; return; }
    this.habitationService.getOne(id).subscribe({
      next: (h) => this.habitation = h,
      error: () => this.erreur = true,
    });
  }

  surMiseAJour(h: Habitation): void {
    this.habitation = h;
  }
}
