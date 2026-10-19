import {inject, Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Order} from './storage/interfaces/order';
import {Customer} from './storage/interfaces/customer';
import {Observable} from 'rxjs';
import {BACKEND_URL} from '../constans';

@Injectable({
  providedIn: 'root'
})
export class BackendService {
  private readonly httpClient: HttpClient = inject(HttpClient);


  createPdf(order: Order, customer: Customer): Observable<any> {
    return this.httpClient.post(`${BACKEND_URL}/orders`, {order, customer})
  }

  sendMail(order: Order, customer: Customer): Observable<any> {
    return this.httpClient.post(`${BACKEND_URL}/orders/send-invoice`, {order, customer});
  }

  saveCustomerBackup(customerBackup: string): Observable<any> {
    return this.httpClient.post(`${BACKEND_URL}/customers/backup`, {customerBackup});
  }

  saveOrderBackup(orderBackup: string): Observable<any> {
    return this.httpClient.post(`${BACKEND_URL}/orders/backup`, {orderBackup});
  }

  saveArticleTypesBackup(articleTypesBackup: string): Observable<any> {
    return this.httpClient.post(`${BACKEND_URL}/articleTypes/backup`, {articleTypesBackup});
  }
}
