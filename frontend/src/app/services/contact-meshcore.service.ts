import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { ContactMeshCore } from '../shared/models/contact-meshcore.model';

/** Répertoire de contacts déjà tenu par le firmware d'un companion, synchronisé
 * périodiquement par le service-pont — lecture seule ici (voir ContactMeshCoreViewSet). */
@Injectable({ providedIn: 'root' })
export class ContactMeshCoreService {

  private url = `${environment.apiUrl}/contacts-meshcore`;

  constructor(private http: HttpClient) {}

  getAll(compagnonId?: string): Observable<ContactMeshCore[]> {
    return this.http.get<ContactMeshCore[]>(`${this.url}/`, { params: compagnonId ? { compagnon: compagnonId } : {} });
  }

  /** GET /api/contacts-meshcore/analyse-securite/ — analyse passive des clés publiques déjà
   * connues (aucune requête mesh) : clé à entropie anormalement basse, clé dupliquée entre
   * deux identités différentes. Inspiré de MeshMonitor (github.com/Yeraze/meshmonitor). */
  analyseSecurite(): Observable<AnalyseSecuriteMeshCore> {
    return this.http.get<AnalyseSecuriteMeshCore>(`${this.url}/analyse-securite/`);
  }
}

export interface CleFaibleMeshCore {
  contact_id: string;
  pubkey_hex: string;
  nom: string;
  compagnon_id: string;
  compagnon_nom: string;
  probleme: string;
}

export interface CleDupliqueeMeshCore {
  pubkey_hex: string;
  noms: string[];
}

export interface AnalyseSecuriteMeshCore {
  cles_faibles: CleFaibleMeshCore[];
  cles_dupliquees: CleDupliqueeMeshCore[];
}
