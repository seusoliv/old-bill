import {inject, Injectable} from '@angular/core';
import {Order} from './interfaces/order';
import {SnackBarService} from '../snack-bar.service';
import {ORDER_STORE} from './stores/order-store';

@Injectable({
  providedIn: 'root'
})
export class OrdersService {
  private readonly store = inject(ORDER_STORE);
  private readonly snackBarService: SnackBarService = inject(SnackBarService);

  createOrder(order: Order): Promise<number | void> {
    return this.store.create(order)
      .catch(() => this.snackBarService.openSnackBar('Auftrag konnte nicht erstellt werden'));
  }

  getAllOrders(): Promise<Order[] | void> {
    return this.store.getAll()
      .catch(() => this.snackBarService.openSnackBar('Aufräge konnten nicht geladen werden'));
  }

  findOrders(searchString: string): Promise<Order[] | void> {
    return this.store.find(searchString)
      .catch(() => this.snackBarService.openSnackBar('Aufräge konnten nicht geladen werden'));
  }

  updateOrder(order: Order): Promise<number | void> {
    return this.store.update(order)
      .catch(() => this.snackBarService.openSnackBar('Auftrag konnte nicht aktualisiert werden'));
  }

  deleteOrder(orderNumber: number): Promise<void> {
    return this.store.delete(orderNumber)
      .catch(() => this.snackBarService.openSnackBar('Auftrag konnte nicht gelöscht werden'));
  }
}
