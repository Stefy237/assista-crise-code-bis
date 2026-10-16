import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { TypeVulnerabilite, PersonneVulnerable } from '../shared/models/vulnerabilite.model';

@Injectable({ providedIn: 'root' })
export class TypeVulnerabiliteService {
  private url = `${environment.apiUrl}/types-vulnerabilite`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<TypeVulnerabilite[]> {
    return this.http.get<TypeVulnerabilite[]>(`${this.url}/`);
  }

  search(query: string): Observable<TypeVulnerabilite[]> {
    return this.http.get<TypeVulnerabilite[]>(`${this.url}/`, { params: { q: query } });
  }

  create(data: Partial<TypeVulnerabilite>): Observable<TypeVulnerabilite> {
    return this.http.post<TypeVulnerabilite>(`${this.url}/`, data);
  }
}

@Injectable({ providedIn: 'root' })
export class PersonneVulnerableService {
  private url = `${environment.apiUrl}/personnes-vulnerables`;

  constructor(private http: HttpClient) {}

  getAll(params?: Record<string, string>): Observable<PersonneVulnerable[]> {
    return this.http.get<PersonneVulnerable[]>(`${this.url}/`, { params });
  }

  get(id: string): Observable<PersonneVulnerable> {
    return this.http.get<PersonneVulnerable>(`${this.url}/${id}/`);
  }

  create(data: Partial<PersonneVulnerable>): Observable<PersonneVulnerable> {
    return this.http.post<PersonneVulnerable>(`${this.url}/`, data);
  }

  update(id: string, data: Partial<PersonneVulnerable>): Observable<PersonneVulnerable> {
    return this.http.patch<PersonneVulnerable>(`${this.url}/${id}/`, data);
  }

  radier(id: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}/`);
  }
}
