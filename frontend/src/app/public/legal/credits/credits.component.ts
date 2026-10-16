import { Component } from '@angular/core';
import { CONTACT_NOM } from '../../../shared/utils/contact-obfusque.util';

@Component({
  selector: 'app-credits',
  imports: [],
  templateUrl: './credits.component.html',
  styleUrl: './credits.component.scss'
})
export class CreditsComponent {
  readonly contactNom = CONTACT_NOM;
}
