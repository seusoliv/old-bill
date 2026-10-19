import {inject, Injectable} from '@angular/core';
import {ArticleType} from './interfaces/article-type';
import {ARTICLE_TYPE_STORE} from './stores/article-type-store';

@Injectable({
  providedIn: 'root'
})
export class ArticleTypesService {
  private readonly store = inject(ARTICLE_TYPE_STORE);

  getAllArticleTypes(): Promise<ArticleType[]> {
    return this.store.getAll();
  }

  getArticleTypeByNumber(articleNumber: string): Promise<ArticleType | undefined> {
    return this.store.getByNumber(articleNumber);
  }

  createArticleType(articleType: ArticleType): Promise<number> {
    return this.store.create(articleType);
  }

  findArticleTypes(searchString: string, startIndex: number = 1, endIndex: number = 100): Promise<ArticleType[]> {
    return this.store.find(searchString, startIndex, endIndex);
  }

  updateArticleType(articleType: ArticleType): Promise<number> {
    return this.store.update(articleType);
  }

  deleteArticleType(articleTypeId: number): Promise<void> {
    return this.store.delete(articleTypeId);
  }

  deleteAllTypes(): Promise<void> {
    return this.store.clear();
  }
}
