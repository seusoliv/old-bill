import {inject, Provider} from '@angular/core';
import {StorageModeService} from '../../storage-mode.service';
import {CUSTOMER_STORE, HttpCustomerStore, IdbCustomerStore} from './customer-store';
import {HttpOrderStore, IdbOrderStore, ORDER_STORE} from './order-store';
import {ARTICLE_TYPE_STORE, HttpArticleTypeStore, IdbArticleTypeStore} from './article-type-store';

/**
 * Binds each storage token to its IndexedDB or SQLite-backend implementation.
 * The choice is read from {@link StorageModeService} (localStorage) at startup.
 */
export const storageProviders: Provider[] = [
  {
    provide: CUSTOMER_STORE,
    useFactory: () => inject(StorageModeService).isSqliteEnabled() ? inject(HttpCustomerStore) : inject(IdbCustomerStore),
  },
  {
    provide: ORDER_STORE,
    useFactory: () => inject(StorageModeService).isSqliteEnabled() ? inject(HttpOrderStore) : inject(IdbOrderStore),
  },
  {
    provide: ARTICLE_TYPE_STORE,
    useFactory: () => inject(StorageModeService).isSqliteEnabled() ? inject(HttpArticleTypeStore) : inject(IdbArticleTypeStore),
  },
];
