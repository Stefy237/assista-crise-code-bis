import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ReponseContactPCS } from '../shared/models/notification-alerte-pcs.model';

export interface AccuseReceptionPCS {
  crise_nom: string;
  institution_nom: string;
  organisme: string;
  statut: string;
  statut_libelle: string;
  deja_confirme: boolean;
  reponse_contact: ReponseContactPCS | null;
  commentaire_contact: string | null;
}

/** Page publique d'accusé de réception d'une alerte PCS/PICS -- aucune authentification
 * requise, le jeton opaque dans l'URL fait foi (même patron que EngagementRessourceService). */
@Injectable({ providedIn: 'root' })
export class AccuserReceptionPCSService {
  private apiUrl = `${environment.apiUrl}/accuser-reception-pcs`;

  constructor(private http: HttpClient) {}

  getByToken(token: string): Observable<AccuseReceptionPCS> {
    return this.http.get<AccuseReceptionPCS>(`${this.apiUrl}/${token}/`);
  }

  repondre(token: string, reponse: ReponseContactPCS, commentaire: string): Observable<AccuseReceptionPCS> {
    return this.http.post<AccuseReceptionPCS>(`${this.apiUrl}/${token}/`, { reponse, commentaire });
  }
}
