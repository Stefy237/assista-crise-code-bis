import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { TracerouteMeshCore } from '../shared/models/contact-meshcore.model';

/** Diagnostic réseau MeshCore (chemin radio, SNR par saut) — voir TracerouteMeshCore côté
 * backend. Le pont exécute la demande de façon asynchrone (CompagnonMeshCoreViewSet.
 * lancer_traceroute puis boucle_traceroutes côté meshcore-bridge) : after lancer(), il faut
 * repasser par getHistorique() quelques secondes plus tard pour voir le résultat. */
@Injectable({ providedIn: 'root' })
export class TracerouteMeshCoreService {

  private url = `${environment.apiUrl}/traceroutes-meshcore`;
  private urlCompagnons = `${environment.apiUrl}/compagnons-meshcore`;

  constructor(private http: HttpClient) {}

  getHistorique(compagnonId: string): Observable<TracerouteMeshCore[]> {
    return this.http.get<TracerouteMeshCore[]>(`${this.url}/`, { params: { compagnon: compagnonId } });
  }

  lancer(compagnonId: string): Observable<TracerouteMeshCore> {
    return this.http.post<TracerouteMeshCore>(`${this.urlCompagnons}/${compagnonId}/lancer-traceroute/`, {});
  }
}
