import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { SecteurRecherche } from '../shared/models/secteur-recherche.model';

/** Secteurs de recherche (méthode SAR) d'une RecherchePersonne -- voir SecteurRechercheViewSet
 * côté backend (institutionnel uniquement, aligné sur la visibilité de RecherchePersonne). */
@Injectable({ providedIn: 'root' })
export class SecteurRechercheService {

  private url = `${environment.apiUrl}/secteurs-recherche`;

  constructor(private http: HttpClient) {}

  getPourRecherche(recherchePersonneId: string): Observable<SecteurRecherche[]> {
    return this.http.get<SecteurRecherche[]>(`${this.url}/`, { params: { recherche_personne: recherchePersonneId } });
  }

  create(data: { recherche_personne: string; nom: string; polygone: string; equipe?: string | null }): Observable<SecteurRecherche> {
    return this.http.post<SecteurRecherche>(`${this.url}/`, data);
  }

  update(id: string, data: Partial<Pick<SecteurRecherche, 'nom' | 'equipe' | 'statut' | 'commentaire' | 'polygone'>>): Observable<SecteurRecherche> {
    return this.http.patch<SecteurRecherche>(`${this.url}/${id}/`, data);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}/`);
  }
}
