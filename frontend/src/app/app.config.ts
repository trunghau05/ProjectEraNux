import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideBrowserGlobalErrorListeners } from '@angular/core';
import { ApiModule, Configuration } from './apis';
import { routes } from './app.routes';
import { environment } from '../environments/environment';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    importProvidersFrom(
      ApiModule.forRoot(() => new Configuration({ basePath: environment.apiBaseUrl }))
    )
  ]
};
