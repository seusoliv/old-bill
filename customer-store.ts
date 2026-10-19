import {inject, Injectable, InjectionToken} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {firstValueFrom} from 'rxjs';
import {IDBPDatabase, openDB} from 'idb';
import {Customer} from '../interfaces/customer';
import {DatabaseType} from '../interfaces/database-type';
import {getPagedResponse} from '../functions/get-paged-response';
import {BACKEND_URL, DB_NAME, DB_VERSION} from '../../../constans';

/**
 * Abstraction over the customer storage. Two implementations exist:
 * IndexedDB (offline-first) and the SQLite backend (search runs server-side).
 */
export interface CustomerStore {
  getAll(): Promise<Customer[]>;

  get(id: number): Promise<Customer | undefined>;

  create(customer: Customer): Promise<number>;

  update(customer: Customer): Promise<number>;

  delete(id: number): Promise<void>;

  find(search: string, start: number, end: number): Promise<Customer[]>;
}

export const CUSTOMER_STORE = new InjectionToken<CustomerStore>('CUSTOMER_STORE');

@Injectable({providedIn: 'root'})
export class IdbCustomerStore implements CustomerStore {
  private readonly db: Promise<IDBPDatabase<DatabaseType>> = openDB(DB_NAME, DB_VERSION);

  async getAll(): Promise<Customer[]> {
    return (await this.db).getAll('customer');
  }

  async get(id: number): Promise<Customer | undefined> {
    return (await this.db).get('customer', id);
  }

  async create(customer: Customer): Promise<number> {
    return (await this.db).add('customer', customer);
  }

  async update(customer: Customer): Promise<number> {
    return (await this.db).put('customer', customer);
  }

  async delete(id: number): Promise<void> {
    return (await this.db).delete('customer', id);
  }

  async find(search: string, start: number, end: number): Promise<Customer[]> {
    const cursor = await (await this.db).transaction('customer').store.openCursor();
    if (search === '') {
      return getPagedResponse(start, end, cursor, () => true);
    }
    const needle = search.toLowerCase();
    return getPagedResponse(start, end, cursor, (c) =>
      c.value.name.toLowerCase().includes(needle) || c.value.surname.toLowerCase().includes(needle));
  }
}

@Injectable({providedIn: 'root'})
export class HttpCustomerStore implements CustomerStore {
  private readonly http: HttpClient = inject(HttpClient);
  private readonly url = `${BACKEND_URL}/db/customer`;

  getAll(): Promise<Customer[]> {
    return firstValueFrom(this.http.get<Customer[]>(this.url));
  }

  async get(id: number): Promise<Customer | undefined> {
    return (await firstValueFrom(this.http.get<Customer>(`${this.url}/${id}`))) ?? undefined;
  }

  async create(customer: Customer): Promise<number> {
    const {key} = await firstValueFrom(this.http.post<{ key: number }>(this.url, {value: customer}));
    return key;
  }

  async update(customer: Customer): Promise<number> {
    const {key} = await firstValueFrom(this.http.put<{ key: number }>(this.url, {value: customer}));
    return key;
  }

  delete(id: number): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${this.url}/${id}`));
  }

  find(search: string, start: number, end: number): Promise<Customer[]> {
    const params = {search, start: String(start), end: String(end)};
    return firstValueFrom(this.http.get<Customer[]>(this.url, {params}));
  }
}
