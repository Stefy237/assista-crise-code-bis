import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { FicheMateriel, SuiviMaterielEvenement, SuiviMaterielEvenementPayload } from '../shared/models/fiche-materiel.model';

@Injectable({ providedIn: 'root' })
export class FicheMaterielService {
  constructor(private http: HttpClient) {}

  /** GET /api/fiche-materiel/?offre=<id> — voir FicheMaterielView. */
  get(offreId: string): Observable<FicheMateriel> {
    return this.http.get<FicheMateriel>(`${environment.apiUrl}/fiche-materiel/`, {
      params: { offre: offreId },
    });
  }

  /** POST /api/suivi-materiel/ — nouvel événement d'état/maintenance (voir
   * SuiviMaterielEvenementViewSet). */
  ajouterEvenement(payload: SuiviMaterielEvenementPayload): Observable<SuiviMaterielEvenement> {
    return this.http.post<SuiviMaterielEvenement>(`${environment.apiUrl}/suivi-materiel/`, payload);
  }
}
