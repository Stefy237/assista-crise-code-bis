import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { ConfigurationAlerteSismique } from '../shared/models/configuration-alerte-sismique.model';

@Injectable({ providedIn: 'root' })
export class ConfigurationAlerteSismiqueService {

  private url = `${environment.apiUrl}/configurations-alerte-sismique`;

  constructor(private http: HttpClient) {}

  getForInstitution(institutionId: string): Observable<ConfigurationAlerteSismique[]> {
    return this.http.get<ConfigurationAlerteSismique[]>(`${this.url}/`, { params: { institution: institutionId } });
  }

  create(data: { institution: string; actif: boolean; rayon_km: number; magnitude_min: number }): Observable<ConfigurationAlerteSismique> {
    return this.http.post<ConfigurationAlerteSismique>(`${this.url}/`, data);
  }

  update(id: number, data: Partial<ConfigurationAlerteSismique>): Observable<ConfigurationAlerteSismique> {
    return this.http.patch<ConfigurationAlerteSismique>(`${this.url}/${id}/`, data);
  }
}
