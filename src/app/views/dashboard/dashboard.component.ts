import {Component, computed, inject, resource, ResourceRef, Signal} from '@angular/core';
import {CurrencyPipe} from '@angular/common';
import {MatCardModule} from '@angular/material/card';
import {OrdersService} from '../../services/storage/orders.service';
import {Order, OrderState} from '../../services/storage/interfaces/order';
import {LoadingSpinnerService} from '../../services/loading-spinner/loading-spinner.service';
import {SnackBarService} from '../../services/snack-bar.service';

interface MonthRevenue {
  label: string;
  total: number;
  heightPct: number;
}

interface TopCustomer {
  rank: number;
  name: string;
  total: number;
}

interface StateBreakdown {
  label: string;
  count: number;
  pct: number;
  colorClass: string;
}

@Component({
  selector: 'app-dashboard',
  imports: [
    CurrencyPipe,
    MatCardModule,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent {
  private readonly ordersService: OrdersService = inject(OrdersService);
  private readonly loadingSpinnerService: LoadingSpinnerService = inject(LoadingSpinnerService);
  private readonly snackBarService: SnackBarService = inject(SnackBarService);

  private readonly ordersResource: ResourceRef<Order[] | void> = resource<Order[] | void, void>({
    loader: (): Promise<Order[] | void> => {
      this.loadingSpinnerService.activateLoadingSpinner();
      return this.ordersService.getAllOrders()
        .catch((): void => this.snackBarService.openSnackBar('Dashboard konnte nicht geladen werden.'))
        .finally((): void => this.loadingSpinnerService.deactivateLoadingSpinner());
    }
  });

  private readonly allOrders: Signal<Order[]> = computed((): Order[] => this.ordersResource.value() ?? []);

  protected readonly totalRevenue: Signal<number> = computed((): number =>
    this.allOrders().reduce((s, o) => s + o.total, 0)
  );

  protected readonly revenueThisMonth: Signal<number> = computed((): number => {
    const now = new Date();
    return this.allOrders()
      .filter(o => {
        if (!o.closedDate) return false;
        const d = new Date(o.closedDate);
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
      })
      .reduce((s, o) => s + o.total, 0);
  });

  protected readonly openOrdersCount: Signal<number> = computed((): number =>
    this.allOrders().filter(o => o.state === OrderState.OPEN).length
  );

  protected readonly pendingCount: Signal<number> = computed((): number =>
    this.allOrders().filter(o =>
      o.state === OrderState.IN_PROGRESS || o.state === OrderState.SENT_MAIL
    ).length
  );

  protected readonly monthlyRevenue: Signal<MonthRevenue[]> = computed((): MonthRevenue[] => {
    const now = new Date();
    const months = Array.from({length: 6}, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      return {year: d.getFullYear(), month: d.getMonth()};
    });
    const LABELS = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
    const totals = months.map(({year, month}) =>
      this.allOrders()
        .filter(o => {
          if (o.state !== OrderState.CLOSED || !o.closedDate) return false;
          const d = new Date(o.closedDate);
          return d.getFullYear() === year && d.getMonth() === month;
        })
        .reduce((s, o) => s + o.total, 0)
    );
    const max = Math.max(...totals, 1);
    return months.map(({year, month}, i) => ({
      label: `${LABELS[month]} ${String(year).slice(2)}`,
      total: totals[i],
      heightPct: Math.round((totals[i] / max) * 100)
    }));
  });

  protected readonly topCustomers: Signal<TopCustomer[]> = computed((): TopCustomer[] => {
    const map = new Map<string, number>();
    for (const o of this.allOrders()) {
      map.set(o.customerName, (map.get(o.customerName) ?? 0) + o.total);
    }
    return [...map.entries()]
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, total], i) => ({rank: i + 1, name, total}));
  });

  protected readonly stateBreakdown: Signal<StateBreakdown[]> = computed((): StateBreakdown[] => {
    const orders = this.allOrders();
    const total = orders.length || 1;
    const config: {state: OrderState; label: string; colorClass: string}[] = [
      {state: OrderState.OPEN, label: 'Neu', colorClass: 'bg-blue-400'},
      {state: OrderState.IN_PROGRESS, label: 'Rechnung erstellt', colorClass: 'bg-yellow-400'},
      {state: OrderState.SENT_MAIL, label: 'Mail verschickt', colorClass: 'bg-orange-400'},
      {state: OrderState.CLOSED, label: 'Rechnung bezahlt', colorClass: 'bg-green-500'},
    ];
    return config.map(({state, label, colorClass}) => {
      const count = orders.filter(o => o.state === state).length;
      return {label, count, pct: Math.round((count / total) * 100), colorClass};
    });
  });
}
