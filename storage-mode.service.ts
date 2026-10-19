import {Injectable} from '@angular/core';

const STORAGE_MODE_KEY = 'useSqlite';

/**
 * Runtime switch between IndexedDB and the SQLite backend, persisted in
 * localStorage. The value is read once at app startup (provider factories,
 * app initializer), so a change only takes effect after a reload.
 * Default: false → IndexedDB.
 */
@Injectable({
  providedIn: 'root'
})
export class StorageModeService {
  isSqliteEnabled(): boolean {
    return localStorage.getItem(STORAGE_MODE_KEY) === 'true';
  }

  setSqliteEnabled(enabled: boolean): void {
    localStorage.setItem(STORAGE_MODE_KEY, String(enabled));
  }
}
