import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { ModuleDegatsCrise } from '../shared/models/habitation.model';

export interface ModuleDegatsCrisePayload {
  crise: string;
  zone?: string | null;
  actif?: boolean;
}

@Injectable({ providedIn: 'root' })
export class ModuleDegatsCriseService {

  private url = `${environment.apiUrl}/modules-degats`;

  constructor(private http: HttpClient) {}

  getPourCrise(criseId: string): Observable<ModuleDegatsCrise[]> {
    return this.http.get<ModuleDegatsCrise[]>(`${this.url}/?crise=${criseId}`);
  }

  activer(data: ModuleDegatsCrisePayload): Observable<ModuleDegatsCrise> {
    return this.http.post<ModuleDegatsCrise>(`${this.url}/`, data);
  }

  modifier(id: string, data: Partial<ModuleDegatsCrisePayload>): Observable<ModuleDegatsCrise> {
    return this.http.patch<ModuleDegatsCrise>(`${this.url}/${id}/`, data);
  }
}
