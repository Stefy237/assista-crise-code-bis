import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { LogementDisponible, AffecterLogementPayload, AffecterLogementResultat } from '../shared/models/logement-intervenant.model';

@Injectable({ providedIn: 'root' })
export class LogementIntervenantService {
  constructor(private http: HttpClient) {}

  /** GET /api/logements-disponibles/?crise=<id> — centres + offres de particuliers validées,
   * triés par distance à la crise (voir LogementsDisponiblesView). */
  getDisponibles(criseId: string): Observable<LogementDisponible[]> {
    return this.http.get<LogementDisponible[]>(`${environment.apiUrl}/logements-disponibles/`, {
      params: { crise: criseId },
    });
  }

  /** POST /api/affecter-logement/ — affecte un logement à un ou plusieurs intervenants d'un
   * coup (voir AffecterLogementView, sélection groupée). */
  affecter(payload: AffecterLogementPayload): Observable<AffecterLogementResultat> {
    return this.http.post<AffecterLogementResultat>(`${environment.apiUrl}/affecter-logement/`, payload);
  }
}
