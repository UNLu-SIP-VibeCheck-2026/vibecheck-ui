import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const guestGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    return true;
  }

  // Si el usuario YA ha iniciado sesión, no tiene sentido que visite la 
  // pantalla de login o registro. Lo enviamos directamente a su panel (dashboard).
  return router.parseUrl('/dashboard');
};
