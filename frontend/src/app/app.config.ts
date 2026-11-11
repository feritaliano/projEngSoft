import { HttpErrorResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  ApplicationConfig,
  ErrorHandler,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../environments/environment';
import { provideApiConfiguration } from './api/api-configuration';
import { routes } from './app.routes';
import { authInterceptor } from './core/auth/auth.interceptor';
import { AuthService } from './core/auth/auth.service';
import { errorInterceptor } from './core/http/error.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideApiConfiguration(environment.apiRootUrl),
    provideHttpClient(withInterceptors([errorInterceptor, authInterceptor])),
    // The token is only in memory: after a reload, the refresh cookie restores the session.
    // The app always starts (a rejected initializer leaves a blank page): 401 (no session) and
    // status 0 (no server, the banner shows it) are expected; anything else is reported.
    provideAppInitializer(() => {
      const errors = inject(ErrorHandler);
      return firstValueFrom(inject(AuthService).refresh()).catch((error: unknown) => {
        if (error instanceof HttpErrorResponse && (error.status === 401 || error.status === 0)) {
          return;
        }
        errors.handleError(error);
      });
    }),
  ],
};
