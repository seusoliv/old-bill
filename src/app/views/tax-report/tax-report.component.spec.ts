import {ComponentFixture, TestBed} from '@angular/core/testing';
import {TaxReportComponent} from './tax-report.component';
import {OrdersService} from '../../services/storage/orders.service';
import {Order, OrderState} from '../../services/storage/interfaces/order';
import {LoadingSpinnerService} from '../../services/loading-spinner/loading-spinner.service';
import {SnackBarService} from '../../services/snack-bar.service';

const makeOrder = (overrides: Partial<Order> = {}): Order => ({
  orderNumber: 1,
  customerNumber: 1,
  customerName: 'Test Kunde',
  isMailAddressAvailable: false,
  state: OrderState.CLOSED,
  createdDate: new Date('2024-01-01'),
  closedDate: new Date('2024-03-15'),
  positions: [],
  discount: null,
  total: 100,
  ...overrides,
});

describe('TaxReportComponent', () => {
  let component: TaxReportComponent;
  let fixture: ComponentFixture<TaxReportComponent>;
  let ordersServiceSpy: jasmine.SpyObj<OrdersService>;

  const createComponent = async (orders: Order[] = []): Promise<void> => {
    ordersServiceSpy.getAllOrders.and.returnValue(Promise.resolve(orders));
    fixture = TestBed.createComponent(TaxReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };

  beforeEach(async () => {
    ordersServiceSpy = jasmine.createSpyObj('OrdersService', ['getAllOrders']);
    ordersServiceSpy.getAllOrders.and.returnValue(Promise.resolve([]));

    await TestBed.configureTestingModule({
      imports: [TaxReportComponent],
      providers: [
        {provide: OrdersService, useValue: ordersServiceSpy},
        {provide: LoadingSpinnerService, useValue: {activateLoadingSpinner: () => {}, deactivateLoadingSpinner: () => {}}},
        {provide: SnackBarService, useValue: {openSnackBar: () => {}}},
      ]
    }).compileComponents();
  });

  it('should create', async () => {
    await createComponent();
    expect(component).toBeTruthy();
  });

  // ─── reportData ────────────────────────────────────────────────────────────

  describe('reportData', () => {
    it('should return empty array when there are no orders', async () => {
      await createComponent([]);
      expect((component as any).reportData()).toEqual([]);
    });

    it('should exclude OPEN orders', async () => {
      await createComponent([makeOrder({state: OrderState.OPEN, closedDate: undefined})]);
      expect((component as any).reportData()).toEqual([]);
    });

    it('should exclude IN_PROGRESS orders', async () => {
      await createComponent([makeOrder({state: OrderState.IN_PROGRESS, closedDate: undefined})]);
      expect((component as any).reportData()).toEqual([]);
    });

    it('should exclude SENT_MAIL orders', async () => {
      await createComponent([makeOrder({state: OrderState.SENT_MAIL, closedDate: undefined})]);
      expect((component as any).reportData()).toEqual([]);
    });

    it('should exclude CLOSED orders without closedDate', async () => {
      await createComponent([makeOrder({state: OrderState.CLOSED, closedDate: undefined})]);
      expect((component as any).reportData()).toEqual([]);
    });

    it('should include a CLOSED order with closedDate in the selected year', async () => {
      const year = new Date().getFullYear();
      await createComponent([makeOrder({closedDate: new Date(year, 3, 10), total: 250})]);
      const report = (component as any).reportData();
      expect(report.length).toBe(1);
      expect(report[0].total).toBe(250);
    });

    it('should exclude CLOSED orders whose closedDate is in a different year', async () => {
      const year = new Date().getFullYear();
      await createComponent([makeOrder({closedDate: new Date(year - 1, 3, 10)})]);
      expect((component as any).reportData()).toEqual([]);
    });

    it('should use closedDate — not createdDate — for year/month grouping', async () => {
      const year = new Date().getFullYear();
      // created in December last year, closed in January this year
      const order = makeOrder({
        createdDate: new Date(year - 1, 11, 20),
        closedDate: new Date(year, 0, 5),
        total: 180,
      });
      await createComponent([order]);
      const report = (component as any).reportData();
      expect(report.length).toBe(1);
      expect(report[0].label).toBe(`Januar ${year}`);
    });

    it('should group multiple orders in the same month together', async () => {
      const year = new Date().getFullYear();
      await createComponent([
        makeOrder({orderNumber: 1, closedDate: new Date(year, 5, 1), total: 100}),
        makeOrder({orderNumber: 2, closedDate: new Date(year, 5, 20), total: 200}),
      ]);
      const report = (component as any).reportData();
      expect(report.length).toBe(1);
      expect(report[0].orders.length).toBe(2);
      expect(report[0].total).toBe(300);
    });

    it('should create separate groups for orders in different months', async () => {
      const year = new Date().getFullYear();
      await createComponent([
        makeOrder({orderNumber: 1, closedDate: new Date(year, 0, 1), total: 100}),
        makeOrder({orderNumber: 2, closedDate: new Date(year, 5, 1), total: 200}),
        makeOrder({orderNumber: 3, closedDate: new Date(year, 11, 1), total: 300}),
      ]);
      const report = (component as any).reportData();
      expect(report.length).toBe(3);
    });

    it('should not include month groups with zero orders', async () => {
      const year = new Date().getFullYear();
      // only February has an order
      await createComponent([makeOrder({closedDate: new Date(year, 1, 14)})]);
      const report = (component as any).reportData();
      expect(report.every((g: any) => g.orders.length > 0)).toBeTrue();
    });

    it('should use German month labels', async () => {
      const year = new Date().getFullYear();
      const cases: [number, string][] = [
        [0, 'Januar'], [1, 'Februar'], [2, 'März'], [3, 'April'],
        [4, 'Mai'], [5, 'Juni'], [6, 'Juli'], [7, 'August'],
        [8, 'September'], [9, 'Oktober'], [10, 'November'], [11, 'Dezember'],
      ];
      for (const [monthIndex, expectedLabel] of cases) {
        await createComponent([makeOrder({closedDate: new Date(year, monthIndex, 1)})]);
        const report = (component as any).reportData();
        expect(report[0].label).toBe(`${expectedLabel} ${year}`);
      }
    });

    it('should reflect selectedYear changes reactively', async () => {
      const year = new Date().getFullYear();
      await createComponent([
        makeOrder({orderNumber: 1, closedDate: new Date(year, 3, 1), total: 100}),
        makeOrder({orderNumber: 2, closedDate: new Date(year - 1, 3, 1), total: 999}),
      ]);
      (component as any).selectedYear.set(year - 1);
      fixture.detectChanges();
      const report = (component as any).reportData();
      expect(report.length).toBe(1);
      expect(report[0].total).toBe(999);
    });
  });

  // ─── yearTotal ─────────────────────────────────────────────────────────────

  describe('yearTotal', () => {
    it('should return 0 when there are no groups', async () => {
      await createComponent([]);
      expect((component as any).yearTotal()).toBe(0);
    });

    it('should sum totals across all month groups', async () => {
      const year = new Date().getFullYear();
      await createComponent([
        makeOrder({orderNumber: 1, closedDate: new Date(year, 0, 1), total: 100}),
        makeOrder({orderNumber: 2, closedDate: new Date(year, 5, 1), total: 250}),
        makeOrder({orderNumber: 3, closedDate: new Date(year, 11, 1), total: 75}),
      ]);
      expect((component as any).yearTotal()).toBe(425);
    });

    it('should only count orders in the selected year', async () => {
      const year = new Date().getFullYear();
      await createComponent([
        makeOrder({orderNumber: 1, closedDate: new Date(year, 0, 1), total: 100}),
        makeOrder({orderNumber: 2, closedDate: new Date(year - 1, 0, 1), total: 500}),
      ]);
      expect((component as any).yearTotal()).toBe(100);
    });

    it('should update when selectedYear changes', async () => {
      const year = new Date().getFullYear();
      await createComponent([
        makeOrder({orderNumber: 1, closedDate: new Date(year, 0, 1), total: 100}),
        makeOrder({orderNumber: 2, closedDate: new Date(year - 1, 0, 1), total: 500}),
      ]);
      (component as any).selectedYear.set(year - 1);
      fixture.detectChanges();
      expect((component as any).yearTotal()).toBe(500);
    });
  });

  // ─── availableYears ────────────────────────────────────────────────────────

  describe('availableYears', () => {
    it('should always include the current year', async () => {
      await createComponent([]);
      expect((component as any).availableYears()).toContain(new Date().getFullYear());
    });

    it('should include years from current-5 to current+10', async () => {
      await createComponent([]);
      const current = new Date().getFullYear();
      const years = (component as any).availableYears();
      expect(years).toContain(current - 5);
      expect(years).toContain(current + 10);
    });

    it('should include years from CLOSED orders outside the default range', async () => {
      await createComponent([makeOrder({closedDate: new Date(1999, 0, 1)})]);
      expect((component as any).availableYears()).toContain(1999);
    });

    it('should not add years from non-CLOSED orders', async () => {
      await createComponent([
        makeOrder({state: OrderState.OPEN, closedDate: undefined}),
      ]);
      const years = (component as any).availableYears();
      const current = new Date().getFullYear();
      // Only the default range should be present
      expect(years.every((y: number) => y >= current - 5 && y <= current + 10)).toBeTrue();
    });

    it('should not add years from CLOSED orders without a closedDate', async () => {
      await createComponent([makeOrder({state: OrderState.CLOSED, closedDate: undefined})]);
      const years = (component as any).availableYears();
      const current = new Date().getFullYear();
      expect(years.every((y: number) => y >= current - 5 && y <= current + 10)).toBeTrue();
    });

    it('should be sorted in descending order', async () => {
      await createComponent([makeOrder({closedDate: new Date(1999, 0, 1)})]);
      const years = (component as any).availableYears();
      for (let i = 0; i < years.length - 1; i++) {
        expect(years[i]).toBeGreaterThan(years[i + 1]);
      }
    });

    it('should not contain duplicate years', async () => {
      const year = new Date().getFullYear();
      // Two closed orders in the same year that is already in the default range
      await createComponent([
        makeOrder({orderNumber: 1, closedDate: new Date(year, 0, 1)}),
        makeOrder({orderNumber: 2, closedDate: new Date(year, 5, 1)}),
      ]);
      const years = (component as any).availableYears();
      const unique = new Set(years);
      expect(unique.size).toBe(years.length);
    });
  });

  // ─── selectedYear ──────────────────────────────────────────────────────────

  describe('selectedYear', () => {
    it('should default to the current year', async () => {
      await createComponent([]);
      expect((component as any).selectedYear()).toBe(new Date().getFullYear());
    });
  });
});
