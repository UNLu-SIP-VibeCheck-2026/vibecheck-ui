import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const roleGuard = (allowedRoles: string[]): CanActivateFn => {
  return () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    const userRole = authService.getCurrentUserValue()?.role?.toLowerCase();

    if (allowedRoles.includes(userRole || '')) {
      return true;
    }

    // Redirect to dashboard if role doesn't match
    return router.parseUrl('/dashboard');
  };
};
