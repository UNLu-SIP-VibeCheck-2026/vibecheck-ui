import { inject, Injectable } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { ErrorDialogComponent } from '../components/shared/dialogs/error-dialog/error-dialog.component';

@Injectable({
  providedIn: 'root'
})
export class ErrorService {
  private dialog = inject(MatDialog);
  private activeDialogRef: MatDialogRef<ErrorDialogComponent> | null = null;

  /**
   * Opens the generic ErrorDialogComponent with a title and message.
   * Prevents opening multiple dialogs simultaneously.
   */
  showError(message: string, title: string = 'Ha ocurrido un error'): void {
    if (this.activeDialogRef) {
      console.warn('Ya hay un diálogo de error activo. Omitiendo:', message);
      return;
    }

    this.activeDialogRef = this.dialog.open(ErrorDialogComponent, {
      width: '400px',
      data: { title, message },
      autoFocus: false
    });

    this.activeDialogRef.afterClosed().subscribe(() => {
      this.activeDialogRef = null;
    });
  }

  /**
   * Parses an error response (like HttpErrorResponse) and displays a modal.
   */
  handleError(error: any, defaultMessage: string = 'Ocurrió un error inesperado al procesar la solicitud'): void {
    console.error('Error capturado:', error);
    
    let message = defaultMessage;
    let title = 'Ha ocurrido un error';

    // Handle specific scope validation error for validators
    if (error && error.status === 403) {
      if (error.error && typeof error.error === 'string') {
        try {
          const parsed = JSON.parse(error.error);
          if (parsed.message && parsed.message.includes('scope') || parsed.message.includes('assignedEventId')) {
            title = 'Error de Validación de Alcance';
            message = 'No tienes permiso para validar entradas de este evento. Los validadores solo pueden canjear entradas del evento al que están asignados.';
            this.showError(message, title);
            return;
          }
        } catch {
          // If parsing fails, continue with default handling
        }
      }
    }

    if (error && error.error) {
      if (typeof error.error === 'string') {
        try {
          const parsed = JSON.parse(error.error);
          message = parsed.message || parsed.error || message;
        } catch {
          message = error.error;
        }
      } else if (typeof error.error === 'object') {
        message = error.error.message || error.error.error || message;
      }
    } else if (error && error.message) {
      message = error.message;
    }

    this.showError(message, title);
  }
}
