import { inject } from '@angular/core';
import {
  HttpRequest,
  HttpHandlerFn,
  HttpInterceptorFn,
  HttpErrorResponse,
  HttpContextToken
} from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { ErrorService } from '../services/error.service';

/**
 * Token to bypass global error dialog presentation.
 * Useful for login or inline validation requests.
 */
export const BYPASS_GLOBAL_ERROR = new HttpContextToken<boolean>(() => false);

export const errorInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
) => {
  const errorService = inject(ErrorService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // If bypass is explicitly set, just forward the error
      if (req.context.get(BYPASS_GLOBAL_ERROR)) {
        return throwError(() => error);
      }

      // We don't intercept 401 auth errors as they are handled by the jwtInterceptor (refresh token or redirection)
      if (error.status !== 401) {
        errorService.handleError(error);
      }

      return throwError(() => error);
    })
  );
};
