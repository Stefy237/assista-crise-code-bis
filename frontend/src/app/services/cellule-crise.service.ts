import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { CelluleCrise } from '../shared/models/cellule-crise.model';

@Injectable({ providedIn: 'root' })
export class CelluleCriseService {

  constructor(private http: HttpClient) {}

  get(criseId: string): Observable<CelluleCrise> {
    return this.http.get<CelluleCrise>(`${environment.apiUrl}/crises/${criseId}/cellule/`);
  }
}
