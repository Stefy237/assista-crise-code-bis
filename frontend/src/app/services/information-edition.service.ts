import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Information } from '../shared/models/information.model';

/** Page publique de modification d'un signalement — aucune authentification requise, le jeton
 * opaque reçu par email (Information.edition_token) fait foi. Voir InformationEditionPublicView. */
@Injectable({ providedIn: 'root' })
export class InformationEditionService {
  private apiUrl = `${environment.apiUrl}/edit-information`;

  constructor(private http: HttpClient) {}

  getByToken(token: string): Observable<Information> {
    return this.http.get<Information>(`${this.apiUrl}/${token}/`);
  }

  update(token: string, data: Partial<Information>): Observable<Information> {
    return this.http.patch<Information>(`${this.apiUrl}/${token}/`, data);
  }
}
