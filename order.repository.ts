import {getDb} from "./database.service";
import {Order} from "../../../src/app/services/storage/interfaces/order";
import {Position} from "../../../src/app/shared/components/interfaces/position.interface";

// Structured filter for order queries; all set fields are AND-combined.
export interface OrderFilter {
  search?: string;          // customerName LIKE / CAST(orderNumber AS TEXT) LIKE
  customerNumber?: number;  // exact FK match → all orders of a customer
  state?: string;           // OPEN | IN_PROGRESS | SENT_MAIL | CLOSED
  createdFrom?: string;     // date(createdDate) >= date(?), ISO or YYYY-MM-DD
  createdTo?: string;       // date(createdDate) <= date(?), inclusive by day
  onlyOverdue?: boolean;    // payDate < now AND state != CLOSED
  start?: number;           // pagination offset (1-based, like the other stores)
  end?: number;             // pagination limit
}

export interface RevenueReport {
  months: {month: string; revenue: number; orderCount: number}[];
  total: number;
  orderCount: number;
}

// Dates are stored as ISO strings; the Angular frontend revives them to `Date`.
function toIso(value: unknown): string | null {
  if (value == null) {
    return null;
  }
  return value instanceof Date ? value.toISOString() : String(value);
}

function mapRow(row: any): Order {
  return {
    orderNumber: row.orderNumber,
    customerNumber: row.customerNumber,
    customerName: row.customerName,
    isMailAddressAvailable: !!row.isMailAddressAvailable,
    state: row.state,
    createdDate: row.createdDate as unknown as Date,
    closedDate: (row.closedDate ?? undefined) as unknown as Date | undefined,
    payDate: (row.payDate ?? undefined) as unknown as Date | undefined,
    positions: JSON.parse(row.positions ?? "[]") as Position[],
    discount: row.discount,
    total: row.total,
  };
}

export class OrderRepository {
  static getAll(): Order[] {
    return getDb().prepare("SELECT * FROM orders").all().map(mapRow);
  }

  static get(orderNumber: number): Order | undefined {
    const row = getDb().prepare("SELECT * FROM orders WHERE orderNumber = ?").get(orderNumber);
    return row ? mapRow(row) : undefined;
  }

  static find(filter: string | OrderFilter = ""): Order[] {
    const f: OrderFilter = typeof filter === "string" ? {search: filter} : filter;
    const where: string[] = [];
    const params: unknown[] = [];

    if (f.search) {
      const like = `%${f.search.toLowerCase()}%`;
      where.push("(lower(customerName) LIKE ? OR CAST(orderNumber AS TEXT) LIKE ?)");
      params.push(like, like);
    }
    if (f.customerNumber != null) {
      where.push("customerNumber = ?");
      params.push(f.customerNumber);
    }
    if (f.state) {
      where.push("state = ?");
      params.push(f.state);
    }
    if (f.createdFrom) {
      where.push("date(createdDate) >= date(?)");
      params.push(f.createdFrom);
    }
    if (f.createdTo) {
      where.push("date(createdDate) <= date(?)");
      params.push(f.createdTo);
    }
    if (f.onlyOverdue) {
      where.push("payDate IS NOT NULL AND payDate < ? AND state != 'CLOSED'");
      params.push(new Date().toISOString());
    }

    let sql = "SELECT * FROM orders";
    if (where.length) {
      sql += " WHERE " + where.join(" AND ");
    }
    sql += " ORDER BY orderNumber DESC";
    if (f.end != null) {
      const offset = Math.max(0, (f.start ?? 1) - 1);
      sql += " LIMIT ? OFFSET ?";
      params.push(f.end, offset);
    }
    return getDb().prepare(sql).all(...params).map(mapRow);
  }

  static getRevenue(opts: {year?: number; from?: string; to?: string} = {}): RevenueReport {
    const where: string[] = ["state = 'CLOSED'"];
    const params: unknown[] = [];
    if (opts.year != null) {
      where.push("strftime('%Y', createdDate) = ?");
      params.push(String(opts.year));
    }
    if (opts.from) {
      where.push("date(createdDate) >= date(?)");
      params.push(opts.from);
    }
    if (opts.to) {
      where.push("date(createdDate) <= date(?)");
      params.push(opts.to);
    }
    const months = getDb().prepare(
      "SELECT strftime('%Y-%m', createdDate) AS month, SUM(total) AS revenue, COUNT(*) AS orderCount " +
      "FROM orders WHERE " + where.join(" AND ") + " GROUP BY month ORDER BY month")
      .all(...params) as {month: string; revenue: number; orderCount: number}[];
    const total = months.reduce((sum, m) => sum + (m.revenue ?? 0), 0);
    const orderCount = months.reduce((sum, m) => sum + m.orderCount, 0);
    return {months, total, orderCount};
  }

  static add(order: Order): number {
    const info = getDb().prepare(
      "INSERT INTO orders (customerNumber, customerName, isMailAddressAvailable, state, createdDate, closedDate, payDate, positions, discount, total) " +
      "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .run(order.customerNumber, order.customerName, order.isMailAddressAvailable ? 1 : 0, order.state,
        toIso(order.createdDate), toIso(order.closedDate), toIso(order.payDate),
        JSON.stringify(order.positions ?? []), order.discount ?? null, order.total);
    return Number(info.lastInsertRowid);
  }

  static put(order: Order): number {
    if (order.orderNumber == null) {
      return this.add(order);
    }
    getDb().prepare(
      "INSERT INTO orders (orderNumber, customerNumber, customerName, isMailAddressAvailable, state, createdDate, closedDate, payDate, positions, discount, total) " +
      "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) " +
      "ON CONFLICT(orderNumber) DO UPDATE SET customerNumber=excluded.customerNumber, customerName=excluded.customerName, " +
      "isMailAddressAvailable=excluded.isMailAddressAvailable, state=excluded.state, createdDate=excluded.createdDate, " +
      "closedDate=excluded.closedDate, payDate=excluded.payDate, positions=excluded.positions, " +
      "discount=excluded.discount, total=excluded.total")
      .run(order.orderNumber, order.customerNumber, order.customerName, order.isMailAddressAvailable ? 1 : 0,
        order.state, toIso(order.createdDate), toIso(order.closedDate), toIso(order.payDate),
        JSON.stringify(order.positions ?? []), order.discount ?? null, order.total);
    return order.orderNumber;
  }

  static delete(orderNumber: number): void {
    getDb().prepare("DELETE FROM orders WHERE orderNumber = ?").run(orderNumber);
  }
}
