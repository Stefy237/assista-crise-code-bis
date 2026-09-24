import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SuiviPositionPermanentService } from './services/suivi-position-permanent.service';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    CommonModule
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  title = 'assista-crise-front';

  constructor(private suiviPosition: SuiviPositionPermanentService) {}

  ngOnInit(): void {
    // Cas "session déjà valide au chargement de la page" (token encore en localStorage) --
    // AuthService.setSession couvre le cas "connexion vient d'avoir lieu dans cette session
    // SPA", celui-ci couvre le rechargement complet de page avec une session existante.
    this.suiviPosition.demarrerSiConsentement();
  }
}
