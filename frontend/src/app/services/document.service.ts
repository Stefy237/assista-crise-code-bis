import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { DossierDocument } from '../shared/models/dossier-document.model';

@Injectable({
  providedIn: 'root'
})
export class DocumentService {

  private apiUrl =
    `${environment.apiUrl}/documents/`;

  constructor(
    private http: HttpClient
  ) {}

  getAll(params: { dossier?: string; habitation?: string; demande?: string; offre?: string } = {}): Observable<DossierDocument[]> {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v) query.set(k, v); });
    const suffix = query.toString();
    return this.http.get<DossierDocument[]>(`${this.apiUrl}${suffix ? '?' + suffix : ''}`);
  }

  create(formData: FormData): Observable<DossierDocument> {
    return this.http.post<DossierDocument>(
      this.apiUrl,
      formData
    );
  }

  download(
    documentId: string
  ): Observable<Blob> {

    return this.http.get(
      `${this.apiUrl}${documentId}/download/`,
      {
        responseType: 'blob'
      }
    );

  }

  preview(
    documentId: string
  ): Observable<Blob> {

    return this.http.get(
      `${this.apiUrl}${documentId}/preview/`,
      {
        responseType: 'blob'
      }
    );

  }

}
