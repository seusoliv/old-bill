import {DbService} from "../services/storage/db.service";
import {StorageModeService} from "../services/storage-mode.service";

export async function appInitialize(dbService: DbService, storageMode: StorageModeService): Promise<void> {
  if (storageMode.isSqliteEnabled()) {
    // SQLite mode keeps all data in the backend, no local IndexedDB schema needed.
    return;
  }
  console.log("Initializing database");
  await dbService.initDatabase();
  console.log("Initializing database end");
  return;
}
