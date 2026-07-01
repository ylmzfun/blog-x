import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError, from, EMPTY } from 'rxjs';
import { AuthService } from './auth.service';

let isRefreshing = false;

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.getAccessToken();

  const cloned = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(cloned).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && !req.url.includes('/auth/') && token) {
        if (!isRefreshing) {
          isRefreshing = true;
          return from(auth.refreshToken()).pipe(
            switchMap((newToken) => {
              isRefreshing = false;
              if (newToken) {
                return next(req.clone({ setHeaders: { Authorization: `Bearer ${newToken}` } }));
              }
              auth.logout();
              return throwError(() => error);
            }),
          );
        }
        isRefreshing = false;
      }
      return throwError(() => error);
    }),
  );
};
