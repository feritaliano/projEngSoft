import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/** Protected pages need a session; the API still authorizes every request. */
export const authGuard: CanActivateFn = () =>
  inject(AuthService).accessToken() !== null || inject(Router).createUrlTree(['/entrar']);
