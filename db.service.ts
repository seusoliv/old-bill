import {Injectable} from '@angular/core';
import {IDBPDatabase, openDB} from 'idb';
import {DatabaseType} from "./interfaces/database-type";
import {DB_NAME, DB_VERSION} from "../../constans";

@Injectable({
  providedIn: 'root'
})
export class DbService {
  db?: IDBPDatabase<DatabaseType>;

  public async initDatabase(): Promise<void> {
    try {
      this.db = await openDB(DB_NAME, DB_VERSION, {
        upgrade(db): void {
          console.log('Updating database');
          db.createObjectStore('customer', {autoIncrement: true, keyPath: 'id'})
          db.createObjectStore('articleTypes', {autoIncrement: true, keyPath: 'id'})
          db.createObjectStore('orders', {autoIncrement: true, keyPath: 'orderNumber'})
        }
      })
    } catch (error) {
      console.log(error);
    }
  }
}

