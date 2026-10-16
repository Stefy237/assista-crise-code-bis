import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { InterlocuteurAlertePCS } from '../shared/models/interlocuteur-alerte-pcs.model';

@Injectable({ providedIn: 'root' })
export class InterlocuteurAlertePCSService {

  private url = `${environment.apiUrl}/interlocuteurs-alerte-pcs`;

  constructor(private http: HttpClient) {}

  getForInstitution(institutionId: string): Observable<InterlocuteurAlertePCS[]> {
    return this.http.get<InterlocuteurAlertePCS[]>(`${this.url}/`, { params: { institution: institutionId } });
  }

  /** Recherche un interlocuteur déjà déclaré (par une autre institution comprise), bornée par
   * défaut au département de l'institution appelante côté serveur -- voir
   * InterlocuteurAlertePCSViewSet.list. */
  search(query: string): Observable<InterlocuteurAlertePCS[]> {
    return this.http.get<InterlocuteurAlertePCS[]>(`${this.url}/`, { params: { q: query } });
  }

  create(data: Partial<InterlocuteurAlertePCS>): Observable<InterlocuteurAlertePCS> {
    return this.http.post<InterlocuteurAlertePCS>(`${this.url}/`, data);
  }

  update(id: string, data: Partial<InterlocuteurAlertePCS>): Observable<InterlocuteurAlertePCS> {
    return this.http.patch<InterlocuteurAlertePCS>(`${this.url}/${id}/`, data);
  }

  /** Rattache l'institution appelante à un interlocuteur existant -- jamais de doublon créé. */
  rattacher(id: string): Observable<InterlocuteurAlertePCS> {
    return this.http.post<InterlocuteurAlertePCS>(`${this.url}/${id}/rattacher/`, {});
  }

  /** Retire SEULEMENT l'institution appelante -- l'interlocuteur reste rattaché aux autres. */
  detacher(id: string): Observable<InterlocuteurAlertePCS> {
    return this.http.post<InterlocuteurAlertePCS>(`${this.url}/${id}/detacher/`, {});
  }
}
