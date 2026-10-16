import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { AlerteMeshSOS } from '../shared/models/alerte-sos-mesh.model';

/** Historique des détections SOS sur messages mesh entrants -- réservé aux administrateurs
 * (voir AlerteMeshSOSViewSet côté backend, IsAuthenticated + rôle ADMIN). */
@Injectable({ providedIn: 'root' })
export class AlerteMeshSOSService {

  private url = `${environment.apiUrl}/alertes-sos-mesh`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<AlerteMeshSOS[]> {
    return this.http.get<AlerteMeshSOS[]>(`${this.url}/`);
  }
}
