import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { FicheIntervenant } from '../shared/models/fiche-intervenant.model';

@Injectable({ providedIn: 'root' })
export class FicheIntervenantService {
  constructor(private http: HttpClient) {}

  /** GET /api/fiche-intervenant/?user=<id>&crise=<id>&equipe=<id> — voir FicheIntervenantView.
   * `crise`/`equipe` sont optionnels (nécessaires pour résoudre le logement actuel et les
   * événements d'équipe mentionnant cette personne). */
  get(userId: string, criseId?: string | null, equipeId?: string | null): Observable<FicheIntervenant> {
    const params: Record<string, string> = { user: userId };
    if (criseId) params['crise'] = criseId;
    if (equipeId) params['equipe'] = equipeId;
    return this.http.get<FicheIntervenant>(`${environment.apiUrl}/fiche-intervenant/`, { params });
  }
}
