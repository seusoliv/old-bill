import {IDBPCursorWithValue, StoreNames, StoreValue} from 'idb';
import {DatabaseType} from '../interfaces/database-type';

export async function getPagedResponse<T extends StoreNames<DatabaseType>>
(startIndex: number, endIndex: number, cursor: IDBPCursorWithValue<DatabaseType, [T], T> | null, compareFunc: (cursor: IDBPCursorWithValue<DatabaseType, [T], T>) => boolean): Promise<StoreValue<DatabaseType, T>[]> {
  if (cursor == null) return [];
  const filteredEntries: StoreValue<DatabaseType, T>[] = [];

  if (startIndex !== 1) await cursor.advance(startIndex - 1);

  while (cursor && filteredEntries.length < endIndex) {
    if (compareFunc(cursor)) {
      filteredEntries.push(cursor.value);
    }
    cursor = await cursor.continue();
  }

  return filteredEntries;
}
