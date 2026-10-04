import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Request } from '../shared/models/request.model';

/** Page publique de modification d'une demande — aucune authentification requise, le jeton
 * opaque reçu par email (Request.edition_token) fait foi. Voir RequestEditionPublicView. */
@Injectable({ providedIn: 'root' })
export class RequestEditionService {
  private apiUrl = `${environment.apiUrl}/edit-request`;

  constructor(private http: HttpClient) {}

  getByToken(token: string): Observable<Request> {
    return this.http.get<Request>(`${this.apiUrl}/${token}/`);
  }

  update(token: string, data: Partial<Request>): Observable<Request> {
    return this.http.patch<Request>(`${this.apiUrl}/${token}/`, data);
  }
}
