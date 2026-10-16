import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { environment } from '../../environments/environment';
import { DisponibiliteOffre, DisponibiliteOffrePayload } from '../shared/models/disponibilite-offre.model';

@Injectable({ providedIn: 'root' })
export class DisponibiliteOffreService {
  private apiUrl = `${environment.apiUrl}/disponibilites-offres`;

  constructor(private http: HttpClient) {}

  getByOffer(offerId: string): Observable<DisponibiliteOffre[]> {
    return this.http.get<DisponibiliteOffre[]>(`${this.apiUrl}/`, { params: { offer: offerId } });
  }

  /** GET /api/disponibilites-offres/?offer__in=<id1>,<id2>,... — ne récupère que les créneaux
   * d'un lot d'offres déjà connu (ex: celles d'une crise), jamais la table entière (27k+
   * lignes mesurées, croît avec Offer). À préférer à getAll() dès que l'appelant connaît déjà
   * les offres concernées. */
  getByOffers(offerIds: string[]): Observable<DisponibiliteOffre[]> {
    if (offerIds.length === 0) return of([]);
    return this.http.get<DisponibiliteOffre[]>(`${this.apiUrl}/`, { params: { offer__in: offerIds.join(',') } });
  }

  /** @deprecated charge la table entière (voir getByOffers) — conservé uniquement pour un
   * éventuel usage futur légitime (aucun appelant restant après ce correctif). */
  getAll(): Observable<DisponibiliteOffre[]> {
    return this.http.get<DisponibiliteOffre[]>(`${this.apiUrl}/`);
  }

  create(payload: DisponibiliteOffrePayload): Observable<DisponibiliteOffre> {
    return this.http.post<DisponibiliteOffre>(`${this.apiUrl}/`, payload);
  }
}
