import {inject, Injectable, InjectionToken} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {firstValueFrom} from 'rxjs';
import {IDBPDatabase, openDB} from 'idb';
import {ArticleType} from '../interfaces/article-type';
import {DatabaseType} from '../interfaces/database-type';
import {getPagedResponse} from '../functions/get-paged-response';
import {BACKEND_URL, DB_NAME, DB_VERSION} from '../../../constans';

/**
 * Abstraction over the article-type storage (IndexedDB / SQLite backend).
 */
export interface ArticleTypeStore {
  getAll(): Promise<ArticleType[]>;

  getByNumber(articleNumber: string): Promise<ArticleType | undefined>;

  create(articleType: ArticleType): Promise<number>;

  update(articleType: ArticleType): Promise<number>;

  delete(id: number): Promise<void>;

  clear(): Promise<void>;

  find(search: string, start: number, end: number): Promise<ArticleType[]>;
}

export const ARTICLE_TYPE_STORE = new InjectionToken<ArticleTypeStore>('ARTICLE_TYPE_STORE');

@Injectable({providedIn: 'root'})
export class IdbArticleTypeStore implements ArticleTypeStore {
  private readonly db: Promise<IDBPDatabase<DatabaseType>> = openDB(DB_NAME, DB_VERSION);

  async getAll(): Promise<ArticleType[]> {
    return (await this.db).getAll('articleTypes');
  }

  async getByNumber(articleNumber: string): Promise<ArticleType | undefined> {
    let cursor = await (await this.db).transaction('articleTypes').store.openCursor();
    while (cursor) {
      if (cursor.value.articleNumber === articleNumber) {
        return cursor.value;
      }
      cursor = await cursor.continue();
    }
    return undefined;
  }

  async create(articleType: ArticleType): Promise<number> {
    return (await this.db).add('articleTypes', articleType);
  }

  async update(articleType: ArticleType): Promise<number> {
    return (await this.db).put('articleTypes', articleType);
  }

  async delete(id: number): Promise<void> {
    return (await this.db).delete('articleTypes', id);
  }

  async clear(): Promise<void> {
    return (await this.db).clear('articleTypes');
  }

  async find(search: string, start: number, end: number): Promise<ArticleType[]> {
    const cursor = await (await this.db).transaction('articleTypes').store.openCursor();
    if (search === '') {
      return getPagedResponse(start, end, cursor, () => true);
    }
    const needle = search.toLowerCase();
    return getPagedResponse(start, end, cursor, (c) =>
      c.value.name.toLowerCase().includes(needle) || c.value.articleNumber.toLowerCase().includes(needle));
  }
}

@Injectable({providedIn: 'root'})
export class HttpArticleTypeStore implements ArticleTypeStore {
  private readonly http: HttpClient = inject(HttpClient);
  private readonly url = `${BACKEND_URL}/db/articleTypes`;

  getAll(): Promise<ArticleType[]> {
    return firstValueFrom(this.http.get<ArticleType[]>(this.url));
  }

  async getByNumber(articleNumber: string): Promise<ArticleType | undefined> {
    return (await firstValueFrom(
      this.http.get<ArticleType>(`${this.url}/by-number/${encodeURIComponent(articleNumber)}`))) ?? undefined;
  }

  async create(articleType: ArticleType): Promise<number> {
    const {key} = await firstValueFrom(this.http.post<{ key: number }>(this.url, {value: articleType}));
    return key;
  }

  async update(articleType: ArticleType): Promise<number> {
    const {key} = await firstValueFrom(this.http.put<{ key: number }>(this.url, {value: articleType}));
    return key;
  }

  delete(id: number): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${this.url}/${id}`));
  }

  clear(): Promise<void> {
    return firstValueFrom(this.http.post<void>(`${this.url}/clear`, {}));
  }

  find(search: string, start: number, end: number): Promise<ArticleType[]> {
    const params = {search, start: String(start), end: String(end)};
    return firstValueFrom(this.http.get<ArticleType[]>(this.url, {params}));
  }
}
