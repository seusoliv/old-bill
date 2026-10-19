import fs from "fs";
import path from "path";
import {OrderRepository} from "./order.repository";
import {CustomerRepository} from "./customer.repository";

// Writes a JSON backup under FILE_SAVE_LOCATION/<subDir>/<fileName> and returns the path.
function writeBackup(subDir: string, fileName: string, json: string): string {
  const backupDir = path.join(process.env.FILE_SAVE_LOCATION ?? ".", subDir);
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, {recursive: true});
  }
  const filePath = path.join(backupDir, fileName);
  fs.writeFileSync(filePath, json, "utf8");
  return filePath;
}

/**
 * Backup helper shared by the REST routers (which persist a client-supplied JSON string,
 * e.g. an IndexedDB export) and the MCP tools (which source the data straight from SQLite).
 */
export class BackupService {
  static writeOrders(json: string): string {
    return writeBackup("backup_orders", "orders_backup.json", json);
  }

  static writeCustomers(json: string): string {
    return writeBackup("backup_customer", "customer_backup.json", json);
  }

  // MCP/SQLite path: serialize the current DB contents and write them to disk.
  static backupOrders(): {file: string; count: number} {
    const orders = OrderRepository.getAll();
    return {file: this.writeOrders(JSON.stringify(orders, null, 2)), count: orders.length};
  }

  static backupCustomers(): {file: string; count: number} {
    const customers = CustomerRepository.getAll();
    return {file: this.writeCustomers(JSON.stringify(customers, null, 2)), count: customers.length};
  }
}
