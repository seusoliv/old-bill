import {
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  resource,
  ResourceLoaderParams,
  ResourceRef,
  Signal,
  signal,
  WritableSignal
} from '@angular/core';
import {FormControl, FormsModule, ReactiveFormsModule} from '@angular/forms';
import {MatButton, MatFabButton} from '@angular/material/button';
import {
  MatCard,
  MatCardContent,
  MatCardFooter,
  MatCardHeader,
  MatCardTitle,
  MatCardTitleGroup
} from '@angular/material/card';
import {MatFormField} from '@angular/material/form-field';
import {MatInput} from '@angular/material/input';
import {MatSelect} from '@angular/material/select';
import {MatOption} from '@angular/material/core';
import {MatDialog} from '@angular/material/dialog';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {debounceTime, firstValueFrom} from 'rxjs';
import {DEBOUNCE_TIME} from '../../constans';
import {ConfirmationDialogComponent} from '../../shared/components/confirmation-dialog/confirmation-dialog.component';
import {ConfirmationDialogResult} from '../../shared/components/interfaces/confirmation-dialog-result';
import {Order, OrderState} from '../../services/storage/interfaces/order';
import {OrdersService} from '../../services/storage/orders.service';
import {CreateOrderDialogComponent} from './components/create-order-dialog/create-order-dialog.component';
import {OrderCreateDialogResult} from './interfaces/order-create-dialog-result';
import {OrderCreateDialogData} from './interfaces/order-create-dialog-data';
import {OrderInfoComponent} from './components/order-info/order-info.component';
import {CustomersService} from '../../services/storage/customers.service';
import {BackendService} from '../../services/backend.service';
import {ConfirmationDialogData} from '../../shared/components/interfaces/confirmation-dialog-data';
import {SnackBarService} from '../../services/snack-bar.service';
import {LoadingSpinnerService} from '../../services/loading-spinner/loading-spinner.service';
import {ImportOrderDialogComponent} from './components/import-order-dialog/import-order-dialog.component';

type SortField = 'orderNumber' | 'customerName' | 'createdDate' | 'total';
type SortDirection = 'asc' | 'desc';

@Component({
  selector: 'app-order-overview',
  imports: [
    FormsModule,
    MatButton,
    MatCard,
    MatCardContent,
    MatCardFooter,
    MatCardHeader,
    MatCardTitle,
    MatCardTitleGroup,
    MatFabButton,
    MatFormField,
    MatInput,
    MatOption,
    MatSelect,
    ReactiveFormsModule,
    OrderInfoComponent,
  ],
  templateUrl: './order-overview.component.html',
  styleUrl: './order-overview.component.scss'
})
export class OrderOverviewComponent implements OnInit {
  protected readonly searchString: WritableSignal<string> = signal<string>('');
  protected readonly filterControl: FormControl<string> = new FormControl();
  protected readonly OrderState = OrderState;
  protected readonly sortField: WritableSignal<SortField> = signal<SortField>('orderNumber');
  protected readonly sortDirection: WritableSignal<SortDirection> = signal<SortDirection>('desc');
  private readonly updateOrders: ResourceRef<Order[] | void> = resource<Order[] | void, string>({
    request: (): string => this.searchString(),
    loader: (param: ResourceLoaderParams<string>): Promise<Order[] | void> => {
      return this.loadOrders(param.request);
    },
  })
  protected readonly filteredOrders: Signal<Order[]> = computed((): Order[] => this.updateOrders.value() ?? []);
  protected readonly sortedOrders: Signal<Order[]> = computed((): Order[] => {
    const orders = [...this.filteredOrders()];
    const field = this.sortField();
    const dir = this.sortDirection() === 'asc' ? 1 : -1;
    return orders.sort((a, b) => {
      const aVal = a[field] ?? null;
      const bVal = b[field] ?? null;
      if (aVal === null) return 1;
      if (bVal === null) return -1;
      if (aVal < bVal) return -dir;
      if (aVal > bVal) return dir;
      return 0;
    });
  });
  private readonly ordersService: OrdersService = inject(OrdersService);
  private readonly customerService: CustomersService = inject(CustomersService);
  private readonly dialog: MatDialog = inject(MatDialog);
  private readonly destroyRef: DestroyRef = inject(DestroyRef);
  private readonly appService: BackendService = inject(BackendService);
  private readonly snackbarService: SnackBarService = inject(SnackBarService);
  private readonly loadingSpinnerService: LoadingSpinnerService = inject(LoadingSpinnerService);

  toggleSortDirection(): void {
    this.sortDirection.update((d: SortDirection): SortDirection => d === 'asc' ? 'desc' : 'asc');
  }

  ngOnInit(): void {
    this.filterControl.valueChanges
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        debounceTime(DEBOUNCE_TIME)
      )
      .subscribe({
        next: (searchSting: string): void => this.searchString.set(searchSting)
      });
  }

  onAddOrder(): void {
    const dialog = this.dialog.open<CreateOrderDialogComponent, undefined, OrderCreateDialogResult>(CreateOrderDialogComponent, {
      autoFocus: 'dialog',
      width: '90vw',
      height: '90vh'
    });
    dialog.afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result: OrderCreateDialogResult | undefined): void => {
          if (result !== undefined) {
            this.processDbAction(this.ordersService.createOrder(result.order)
              .then(() => this.snackbarService.openSnackBar(' Auftrag erfolgreich erstellt.'))
              .catch(() => this.snackbarService.openSnackBar(' Auftrag konnte nicht erstellt werden.')));
          }
        }
      });
  }

  onEditOrder(order: Order): void {
    const dialog = this.dialog.open<CreateOrderDialogComponent, OrderCreateDialogData, OrderCreateDialogResult>(CreateOrderDialogComponent, {
      autoFocus: 'dialog',
      data: {
        order
      }
    });
    dialog.afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result: OrderCreateDialogResult | undefined): void => {
          if (result !== undefined) {
            this.processDbAction(this.ordersService.updateOrder(result.order)
              .then(() => this.snackbarService.openSnackBar(' Auftrag erfolgreich aktualisiert.'))
              .catch(() => this.snackbarService.openSnackBar(' Auftrag konnte nicht aktualisiert werden.')));
          }
        }
      });
  }

  onSendMail(order: Order): void {
    const dialog = this.dialog.open<ConfirmationDialogComponent, ConfirmationDialogData, ConfirmationDialogResult>(ConfirmationDialogComponent, {
      width: '460px',
      height: '150px',
      data: {
        title: 'Möchtest du die Rechnung per Mail verschicken?'
      }
    });
    dialog.afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: async (result: ConfirmationDialogResult | undefined): Promise<void> => {
          if (result !== undefined && result.isConfirmed) {
            const orderCopy = structuredClone(order);
            orderCopy.state = OrderState.SENT_MAIL;
            this.loadingSpinnerService.activateLoadingSpinner();
            const customer = await this.customerService.getCustomer(order.customerNumber);
            this.appService.sendMail(order, customer!).subscribe({
              next: (): void => {
                this.processDbAction(this.ordersService.updateOrder(orderCopy));
                this.snackbarService.openSnackBar('Rechnung erfolgreich verschickt.');
              },
              error: (): void => {
                this.loadingSpinnerService.deactivateLoadingSpinner();
                this.snackbarService.openSnackBar('Rechnung konnte nicht verschickt werden.');
              },
            });
          }
        }
      });
  }

  async onCreateBill(order: Order): Promise<void> {
    this.loadingSpinnerService.activateLoadingSpinner();
    const orderCopy = structuredClone(order);
    orderCopy.state = OrderState.IN_PROGRESS;
    const payDate = new Date();
    payDate.setDate(payDate.getDate() + 14);
    orderCopy.payDate = payDate;
    const customer = await this.customerService.getCustomer(orderCopy.customerNumber);
    this.appService.createPdf(orderCopy, customer!).subscribe({
      next: (): void => {
        this.processDbAction(this.ordersService.updateOrder(orderCopy));
        this.snackbarService.openSnackBar('Rechnung erfolgreich erstellt.')
      },
      error: (): void => {
        this.loadingSpinnerService.deactivateLoadingSpinner();
        this.snackbarService.openSnackBar('Rechnung konnte nicht erstellt werden.');
      },
    })
  }

  onImportOrders(): void {
    const dialog = this.dialog.open<ImportOrderDialogComponent>(ImportOrderDialogComponent);
    dialog.afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (): void => { this.updateOrders.reload(); }
      });
  }

  async onExportOrders(): Promise<void> {
    this.loadingSpinnerService.activateLoadingSpinner();
    try {
      const allOrders = await this.ordersService.getAllOrders();
      await firstValueFrom(this.appService.saveOrderBackup(JSON.stringify(allOrders)));
      this.snackbarService.openSnackBar('Aufträge erfolgreich exportiert.');
    } catch {
      this.snackbarService.openSnackBar('Aufträge konnten nicht exportiert werden.');
    }
    this.loadingSpinnerService.deactivateLoadingSpinner();
  }

  onUpdateOrderState(order: Order): void {
    const dialog = this.dialog.open<ConfirmationDialogComponent, ConfirmationDialogData, ConfirmationDialogResult>(ConfirmationDialogComponent, {
      width: '460px',
      height: '150px',
      data: {
        title: 'Soll der Auftrag geschlossen werden?'
      }
    });
    dialog.afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result: ConfirmationDialogResult | undefined): void => {
          if (result !== undefined && result.isConfirmed) {
            order.state = OrderState.CLOSED;
            order.closedDate = new Date();
            this.processDbAction(this.ordersService.updateOrder(order)
              .then(() => this.snackbarService.openSnackBar(' Auftrag erfolgreich aktualisiert.'))
              .catch(() => this.snackbarService.openSnackBar(' Auftrag konnte nicht aktualisiert werden.')));
          }
        }
      });
  }

  onDeleteOrder(orderNumber: number): void {
    const dialog = this.dialog.open<ConfirmationDialogComponent, ConfirmationDialogData, ConfirmationDialogResult>(ConfirmationDialogComponent, {
      width: '460px',
      height: '150px',
      data: {
        title: 'Auftrag wirklich löschen?'
      }
    });
    dialog.afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result: ConfirmationDialogResult | undefined): void => {
          if (result !== undefined && result.isConfirmed) {
            this.processDbAction(this.ordersService.deleteOrder(orderNumber)
              .then(() => this.snackbarService.openSnackBar(' Auftrag erfolgreich gelöscht.'))
              .catch(() => this.snackbarService.openSnackBar(' Auftrag konnte nicht gelöscht werden.')));
          }
        }
      });
  }

  private async loadOrders(searchString: string): Promise<Order[] | void> {
    this.loadingSpinnerService.activateLoadingSpinner();
    return this.ordersService.findOrders(searchString)
      .finally((): void => this.loadingSpinnerService.deactivateLoadingSpinner());
  }

  private processDbAction(promise: Promise<any>): void {
    this.loadingSpinnerService.activateLoadingSpinner();
    promise.finally((): boolean => this.updateOrders.reload());
  }
}
