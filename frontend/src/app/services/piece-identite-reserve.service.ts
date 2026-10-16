import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { PieceIdentiteReserve } from '../shared/models/piece-identite-reserve.model';

@Injectable({ providedIn: 'root' })
export class PieceIdentiteReserveService {
  private url = `${environment.apiUrl}/pieces-identite-reserve`;

  constructor(private http: HttpClient) {}

  mesPieces(): Observable<PieceIdentiteReserve[]> {
    return this.http.get<PieceIdentiteReserve[]>(`${this.url}/`);
  }

  // Crée OU met à jour la pièce selon qu'elle existe déjà -- l'appelant (settings.component)
  // garde l'id après un premier upload, voir uploaderPermis().
  creer(fichiers: { permis_recto?: File; permis_verso?: File }): Observable<PieceIdentiteReserve> {
    return this.http.post<PieceIdentiteReserve>(`${this.url}/`, this.versFormData(fichiers));
  }

  mettreAJour(id: string, fichiers: { permis_recto?: File; permis_verso?: File }): Observable<PieceIdentiteReserve> {
    return this.http.patch<PieceIdentiteReserve>(`${this.url}/${id}/`, this.versFormData(fichiers));
  }

  private versFormData(fichiers: { permis_recto?: File; permis_verso?: File }): FormData {
    const formData = new FormData();
    if (fichiers.permis_recto) formData.append('permis_recto', fichiers.permis_recto);
    if (fichiers.permis_verso) formData.append('permis_verso', fichiers.permis_verso);
    return formData;
  }
}
