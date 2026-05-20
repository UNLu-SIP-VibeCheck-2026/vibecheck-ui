import { inject } from '@angular/core';
import {
  HttpRequest,
  HttpHandlerFn,
  HttpInterceptorFn,
  HttpErrorResponse
} from '@angular/common/http';
import { AuthService } from '../services/auth.service';
import { throwError, catchError, switchMap } from 'rxjs';

export const jwtInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
) => {
  const authService = inject(AuthService);
  const token = authService.getToken();
  const isAuthRequest =
    req.url.includes("/auth/login") || req.url.includes("/users/register") || req.url.includes("/auth/refresh");

  if (token && !isAuthRequest) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && !isAuthRequest) {
        const currentToken = authService.getToken();
        const sentToken = req.headers.get('Authorization')?.replace('Bearer ', '');

        if (currentToken && currentToken !== sentToken) {
          const retryReq = req.clone({
            setHeaders: {
              Authorization: `Bearer ${currentToken}`
            }
          });
          return next(retryReq);
        }

        return authService.refreshToken().pipe(
          switchMap((response) => {
            const authReq = req.clone({
              setHeaders: {
                Authorization: `Bearer ${response.accessToken}`
              }
            });
            return next(authReq);
          }),
          catchError((refreshError) => {
            authService.clearLocalSession();
            return throwError(() => refreshError);
          })
        );
      }
      return throwError(() => error);
    })
  );
};
