import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { FicheIntervenant } from '../shared/models/fiche-intervenant.model';

@Injectable({ providedIn: 'root' })
export class FicheIntervenantService {
  constructor(private http: HttpClient) {}

  /** GET /api/fiche-intervenant/?user=<id>&crise=<id> — voir FicheIntervenantView. `crise` est
   * optionnel (nécessaire seulement pour résoudre le logement actuel de la personne). */
  get(userId: string, criseId?: string | null): Observable<FicheIntervenant> {
    const params: Record<string, string> = { user: userId };
    if (criseId) params['crise'] = criseId;
    return this.http.get<FicheIntervenant>(`${environment.apiUrl}/fiche-intervenant/`, { params });
  }
}
