import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { RisqueMajeurType, RisqueCommunal, SuggestionGeorisques } from '../shared/models/risque-majeur.model';

@Injectable({ providedIn: 'root' })
export class RisqueMajeurTypeService {
  private url = `${environment.apiUrl}/risques-majeurs-types`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<RisqueMajeurType[]> {
    return this.http.get<RisqueMajeurType[]>(`${this.url}/`);
  }

  search(query: string): Observable<RisqueMajeurType[]> {
    return this.http.get<RisqueMajeurType[]>(`${this.url}/`, { params: { q: query } });
  }

  create(data: Partial<RisqueMajeurType>): Observable<RisqueMajeurType> {
    return this.http.post<RisqueMajeurType>(`${this.url}/`, data);
  }
}

@Injectable({ providedIn: 'root' })
export class RisqueCommunalService {
  private url = `${environment.apiUrl}/risques-communaux`;

  constructor(private http: HttpClient) {}

  getForInstitution(institutionId: string): Observable<RisqueCommunal[]> {
    return this.http.get<RisqueCommunal[]>(`${this.url}/`, { params: { institution: institutionId } });
  }

  create(data: Partial<RisqueCommunal>): Observable<RisqueCommunal> {
    return this.http.post<RisqueCommunal>(`${this.url}/`, data);
  }

  update(id: string, data: Partial<RisqueCommunal>): Observable<RisqueCommunal> {
    return this.http.patch<RisqueCommunal>(`${this.url}/${id}/`, data);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}/`);
  }

  suggestionsGeorisques(institutionId: string, force = false): Observable<{ suggestions: SuggestionGeorisques[]; date_maj: string | null }> {
    const params: Record<string, string> = { institution: institutionId };
    if (force) params['force'] = '1';
    return this.http.get<{ suggestions: SuggestionGeorisques[]; date_maj: string | null }>(`${this.url}/suggestions-georisques/`, { params });
  }
}
