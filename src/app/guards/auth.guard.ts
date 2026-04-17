import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }

  // Si no está autenticado, lo mejor en experiencia de usuario
  // es mandarlo al login. De esa manera puede iniciar sesión intencionalmente
  // y posteriormente (si guardáramos el estado) devolverlo a la url solicitada.
  return router.parseUrl('/login');
};
