import { Observable, defer } from 'rxjs';
import { finalize } from 'rxjs/operators';

/**
 * Operador personalizado de RxJS para trackear el estado de carga (loading) de un Observable.
 * Ejecuta el callback pasando `true` al suscribirse y `false` cuando el observable
 * se completa o lanza un error.
 * 
 * @param loadingCallback Función callback que recibe el estado de carga actual.
 */
export function trackLoading<T>(loadingCallback: (isLoading: boolean) => void) {
  return (source: Observable<T>): Observable<T> => {
    return defer(() => {
      loadingCallback(true);
      return source.pipe(
        finalize(() => loadingCallback(false))
      );
    });
  };
}
