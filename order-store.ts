import {inject, Injectable, InjectionToken} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {firstValueFrom} from 'rxjs';
import {IDBPDatabase, openDB} from 'idb';
import {Order} from '../interfaces/order';
import {DatabaseType} from '../interfaces/database-type';
import {BACKEND_URL, DB_NAME, DB_VERSION} from '../../../constans';

/**
 * Abstraction over the order storage. The SQLite backend serialises date
 * fields to ISO strings, so the HTTP implementation revives them to `Date`
 * to stay byte-for-byte compatible with the IndexedDB implementation.
 */
export interface OrderStore {
  getAll(): Promise<Order[]>;

  create(order: Order): Promise<number>;

  update(order: Order): Promise<number>;

  delete(orderNumber: number): Promise<void>;

  find(search: string): Promise<Order[]>;
}

export const ORDER_STORE = new InjectionToken<OrderStore>('ORDER_STORE');

@Injectable({providedIn: 'root'})
export class IdbOrderStore implements OrderStore {
  private readonly db: Promise<IDBPDatabase<DatabaseType>> = openDB(DB_NAME, DB_VERSION);

  async getAll(): Promise<Order[]> {
    return (await this.db).getAll('orders');
  }

  async create(order: Order): Promise<number> {
    return (await this.db).add('orders', order);
  }

  async update(order: Order): Promise<number> {
    return (await this.db).put('orders', order);
  }

  async delete(orderNumber: number): Promise<void> {
    return (await this.db).delete('orders', orderNumber);
  }

  async find(search: string): Promise<Order[]> {
    const all = await this.getAll();
    if (search === '') {
      return all;
    }
    const needle = search.toLowerCase();
    return all.filter((order) =>
      order.customerName.toLowerCase().includes(needle)
      || order.orderNumber!.toString().includes(needle));
  }
}

@Injectable({providedIn: 'root'})
export class HttpOrderStore implements OrderStore {
  private readonly http: HttpClient = inject(HttpClient);
  private readonly url = `${BACKEND_URL}/db/orders`;

  async getAll(): Promise<Order[]> {
    const orders = await firstValueFrom(this.http.get<Order[]>(this.url));
    return orders.map(reviveOrderDates);
  }

  async create(order: Order): Promise<number> {
    const {key} = await firstValueFrom(this.http.post<{ key: number }>(this.url, {value: order}));
    return key;
  }

  async update(order: Order): Promise<number> {
    const {key} = await firstValueFrom(this.http.put<{ key: number }>(this.url, {value: order}));
    return key;
  }

  delete(orderNumber: number): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${this.url}/${orderNumber}`));
  }

  async find(search: string): Promise<Order[]> {
    const orders = await firstValueFrom(this.http.get<Order[]>(this.url, {params: {search}}));
    return orders.map(reviveOrderDates);
  }
}

function reviveOrderDates(order: Order): Order {
  order.createdDate = new Date(order.createdDate);
  if (order.closedDate) order.closedDate = new Date(order.closedDate);
  if (order.payDate) order.payDate = new Date(order.payDate);
  return order;
}
