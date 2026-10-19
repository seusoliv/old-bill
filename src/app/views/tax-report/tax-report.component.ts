import {Component, computed, inject, resource, ResourceRef, Signal, signal, WritableSignal} from '@angular/core';
import {CurrencyPipe, DatePipe} from '@angular/common';
import {MatCardModule} from '@angular/material/card';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatSelectModule} from '@angular/material/select';
import {OrdersService} from '../../services/storage/orders.service';
import {Order, OrderState} from '../../services/storage/interfaces/order';
import {LoadingSpinnerService} from '../../services/loading-spinner/loading-spinner.service';
import {SnackBarService} from '../../services/snack-bar.service';

interface MonthGroup {
  label: string;
  orders: Order[];
  total: number;
}

@Component({
  selector: 'app-tax-report',
  imports: [
    CurrencyPipe,
    DatePipe,
    MatCardModule,
    MatFormFieldModule,
    MatSelectModule,
  ],
  templateUrl: './tax-report.component.html',
  styleUrl: './tax-report.component.scss'
})
export class TaxReportComponent {
  private readonly ordersService: OrdersService = inject(OrdersService);
  private readonly loadingSpinnerService: LoadingSpinnerService = inject(LoadingSpinnerService);
  private readonly snackbarService: SnackBarService = inject(SnackBarService);

  private readonly ordersResource: ResourceRef<Order[] | void> = resource<Order[] | void, void>({
    loader: (): Promise<Order[] | void> => {
      this.loadingSpinnerService.activateLoadingSpinner();
      return this.ordersService.getAllOrders()
        .catch((): void => this.snackbarService.openSnackBar('Report konnte nicht geladen werden.'))
        .finally((): void => this.loadingSpinnerService.deactivateLoadingSpinner());
    }
  });

  private readonly allOrders: Signal<Order[]> = computed((): Order[] => this.ordersResource.value() ?? []);

  protected readonly selectedYear: WritableSignal<number> = signal(new Date().getFullYear());

  protected readonly availableYears: Signal<number[]> = computed((): number[] => {
    const current = new Date().getFullYear();
    const years = new Set<number>();
    for (let y = current - 5; y <= current + 10; y++) {
      years.add(y);
    }
    for (const o of this.allOrders()) {
      if (o.state === OrderState.CLOSED) {
        years.add(new Date(o.closedDate ?? o.createdDate).getFullYear());
      }
    }
    return [...years].sort((a, b) => b - a);
  });

  protected readonly reportData: Signal<MonthGroup[]> = computed((): MonthGroup[] => {
    const year = this.selectedYear();
    const MONTH_LABELS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
                          'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

    return MONTH_LABELS.map((label, month): MonthGroup => {
      const orders = this.allOrders().filter(o => {
        if (o.state !== OrderState.CLOSED) return false;
        const d = new Date(o.closedDate ?? o.createdDate);
        return d.getFullYear() === year && d.getMonth() === month;
      });
      return {
        label: `${label} ${year}`,
        orders,
        total: orders.reduce((s, o) => s + o.total, 0)
      };
    }).filter(g => g.orders.length > 0);
  });

  protected readonly yearTotal: Signal<number> = computed((): number =>
    this.reportData().reduce((s, g) => s + g.total, 0)
  );
}
