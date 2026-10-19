import {DBSchema} from "idb";
import {Customer} from "./customer";
import {ArticleType} from './article-type';
import {Order} from './order';

// export type StoreNames = 'customer' | 'articleTypes' | 'orders';

export interface DatabaseType extends DBSchema {
  customer: {
    value: Customer,
    key: number,
  };
  articleTypes: {
    value: ArticleType,
    key: number,
  }
  orders: {
    value: Order,
    key: number,
  }
}
