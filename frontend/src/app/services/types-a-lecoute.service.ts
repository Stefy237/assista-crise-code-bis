import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { AxeTypeALecoute, TypesALecoute } from '../shared/models/type-a-lecoute.model';

@Injectable({ providedIn: 'root' })
export class TypesALecouteService {

  private url = `${environment.apiUrl}/types-a-lecoute/`;

  constructor(private http: HttpClient) {}

  get(criseId: string, communeCode: string, axe: AxeTypeALecoute): Observable<TypesALecoute> {
    return this.http.get<TypesALecoute>(this.url, {
      params: { crise: criseId, commune_code: communeCode, axe },
    });
  }
}
