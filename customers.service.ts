import {inject, Injectable} from '@angular/core';
import {Customer} from "./interfaces/customer";
import {CUSTOMER_STORE} from './stores/customer-store';

@Injectable({
  providedIn: 'root'
})
export class CustomersService {
  private readonly store = inject(CUSTOMER_STORE);

  createCustomer(customer: Customer): Promise<number> {
    return this.store.create(customer);
  }

  getAllCustomers(): Promise<Customer[]> {
    return this.store.getAll();
  }

  getCustomer(customerId: number): Promise<Customer | undefined> {
    return this.store.get(customerId);
  }

  findCustomers(searchString: string, startIndex: number = 1, endIndex: number = 50): Promise<Customer[]> {
    return this.store.find(searchString, startIndex, endIndex);
  }

  updateCustomer(customer: Customer): Promise<number> {
    return this.store.update(customer);
  }

  deleteCustomer(customerId: number): Promise<void> {
    return this.store.delete(customerId);
  }
}
