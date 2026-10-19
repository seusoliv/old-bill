import {getDb} from "./database.service";
import {Customer} from "../../../src/app/services/storage/interfaces/customer";

function mapRow(row: any): Customer {
  return {
    id: row.id,
    name: row.name,
    surname: row.surname,
    email: row.email ?? undefined,
    zipCode: row.zipCode,
    street: row.street,
    city: row.city,
    houseNumber: row.houseNumber,
  };
}

export class CustomerRepository {
  static getAll(): Customer[] {
    return getDb().prepare("SELECT * FROM customer").all().map(mapRow);
  }

  static get(id: number): Customer | undefined {
    const row = getDb().prepare("SELECT * FROM customer WHERE id = ?").get(id);
    return row ? mapRow(row) : undefined;
  }

  static find(search: string, start: number, end: number): Customer[] {
    const limit = end;
    const offset = Math.max(0, start - 1);
    if (!search) {
      return getDb().prepare("SELECT * FROM customer LIMIT ? OFFSET ?").all(limit, offset).map(mapRow);
    }
    const like = `%${search.toLowerCase()}%`;
    return getDb().prepare(
      "SELECT * FROM customer WHERE lower(name) LIKE ? OR lower(surname) LIKE ? LIMIT ? OFFSET ?")
      .all(like, like, limit, offset).map(mapRow);
  }

  static add(customer: Customer): number {
    const info = getDb().prepare(
      "INSERT INTO customer (name, surname, email, zipCode, street, city, houseNumber) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .run(customer.name, customer.surname, customer.email ?? null,
        customer.zipCode, customer.street, customer.city, customer.houseNumber);
    return Number(info.lastInsertRowid);
  }

  static put(customer: Customer): number {
    if (customer.id == null) {
      return this.add(customer);
    }
    getDb().prepare(
      "INSERT INTO customer (id, name, surname, email, zipCode, street, city, houseNumber) " +
      "VALUES (?, ?, ?, ?, ?, ?, ?, ?) " +
      "ON CONFLICT(id) DO UPDATE SET name=excluded.name, surname=excluded.surname, email=excluded.email, " +
      "zipCode=excluded.zipCode, street=excluded.street, city=excluded.city, houseNumber=excluded.houseNumber")
      .run(customer.id, customer.name, customer.surname, customer.email ?? null,
        customer.zipCode, customer.street, customer.city, customer.houseNumber);
    return customer.id;
  }

  static delete(id: number): void {
    getDb().prepare("DELETE FROM customer WHERE id = ?").run(id);
  }
}
