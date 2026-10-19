import {ApplicationConfig, inject, isDevMode, provideAppInitializer, provideZoneChangeDetection} from '@angular/core';
import {provideRouter} from '@angular/router';
import {routes} from './app.routes';
import {provideAnimationsAsync} from '@angular/platform-browser/animations/async';
import {appInitialize} from "./factories/app-init";
import {DbService} from "./services/storage/db.service";
import {StorageModeService} from "./services/storage-mode.service";
import {provideHttpClient} from '@angular/common/http';
import {provideServiceWorker} from '@angular/service-worker';
import {storageProviders} from './services/storage/stores/store.providers';

export const appConfig: ApplicationConfig = {
  providers: [provideZoneChangeDetection({eventCoalescing: true}), provideRouter(routes), provideAnimationsAsync(), provideHttpClient(), ...storageProviders, provideAppInitializer(() => appInitialize(inject(DbService), inject(StorageModeService))), provideServiceWorker('ngsw-worker.js', {
    enabled: !isDevMode(),
    registrationStrategy: 'registerWhenStable:30000'
  })]
};
