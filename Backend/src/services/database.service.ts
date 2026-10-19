import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

let db: Database.Database | undefined;

/**
 * Returns the shared SQLite connection, creating the schema on first access.
 * Tables use real columns (not JSON blobs) so a future MCP server can run
 * native SQL CRUD/search directly against the same database.
 */
export function getDb(): Database.Database {
  if (db) {
    return db;
  }
  const file = process.env.SQLITE_FILE
    ?? path.join(process.env.FILE_SAVE_LOCATION ?? ".", "billkiller.sqlite");
  fs.mkdirSync(path.dirname(file), {recursive: true});
  db = new Database(file);
  db.pragma("journal_mode = WAL");
  createSchema(db);
  return db;
}

function createSchema(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS customer (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      surname TEXT NOT NULL,
      email TEXT,
      zipCode INTEGER,
      street TEXT,
      city TEXT,
      houseNumber TEXT
    );

    CREATE TABLE IF NOT EXISTS articleTypes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      unit TEXT,
      prize REAL,
      additionalInformation TEXT,
      articleNumber TEXT,
      isFlexPrice INTEGER,
      isNegativePosition INTEGER
    );

    CREATE TABLE IF NOT EXISTS orders (
      orderNumber INTEGER PRIMARY KEY AUTOINCREMENT,
      customerNumber INTEGER,
      customerName TEXT,
      isMailAddressAvailable INTEGER,
      state TEXT,
      createdDate TEXT,
      closedDate TEXT,
      payDate TEXT,
      positions TEXT,
      discount REAL,
      total REAL
    );
  `);
}
