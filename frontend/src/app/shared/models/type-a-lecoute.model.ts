import { Besoin } from './besoin.model';

export type AxeTypeALecoute = 'request' | 'offer' | 'information';

export interface TypesALecoute {
  besoins: Besoin[];
  type_ids: string[];
}
