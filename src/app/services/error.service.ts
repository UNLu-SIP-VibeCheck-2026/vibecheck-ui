import { inject, Injectable } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { ErrorDialogComponent } from '../components/shared/dialogs/error-dialog/error-dialog.component';

@Injectable({
  providedIn: 'root'
})
export class ErrorService {
  private dialog = inject(MatDialog);
  private activeDialogRef: MatDialogRef<ErrorDialogComponent> | null = null;

  showDialog(message: string, title: string, severity: 'error' | 'warning' | 'success' = 'error'): void {
    if (this.activeDialogRef) {
      console.warn('Ya hay un diálogo activo. Omitiendo:', message);
      return;
    }

    this.activeDialogRef = this.dialog.open(ErrorDialogComponent, {
      width: '400px',
      data: { title, message, severity },
      autoFocus: false
    });

    this.activeDialogRef.afterClosed().subscribe(() => {
      this.activeDialogRef = null;
    });
  }

  showError(message: string, title: string = 'Ha ocurrido un error'): void {
    this.showDialog(message, title, 'error');
  }

  showWarning(message: string, title: string = 'Atención'): void {
    this.showDialog(message, title, 'warning');
  }

  showSuccess(message: string, title: string = 'Éxito'): void {
    this.showDialog(message, title, 'success');
  }

  /**
   * Parses an error response (like HttpErrorResponse) and displays a modal.
   */
  handleError(error: any, defaultMessage: string = 'Ocurrió un error inesperado al procesar la solicitud'): void {
    console.error('Error capturado:', error);
    
    let message = defaultMessage;
    let title = 'Ha ocurrido un error';
    let severity: 'error' | 'warning' | 'success' = 'error';

    // Handle specific scope validation error for validators
    if (error && error.status === 403) {
      if (error.error && typeof error.error === 'string') {
        try {
          const parsed = JSON.parse(error.error);
          if (parsed.message && parsed.message.includes('scope') || parsed.message.includes('assignedEventId')) {
            title = 'Error de Validación de Alcance';
            message = 'No tienes permiso para validar entradas de este evento. Los validadores solo pueden canjear entradas del evento al que están asignados.';
            this.showDialog(message, title, 'error');
            return;
          }
        } catch {
          // If parsing fails, continue with default handling
        }
      }
    }

    if (error && error.error) {
      let parsedError = error.error;
      if (typeof parsedError === 'string') {
        try {
          parsedError = JSON.parse(parsedError);
          message = parsedError.message || parsedError.error || message;
        } catch {
          message = error.error;
        }
      } else if (typeof parsedError === 'object') {
        message = parsedError.message || parsedError.error || message;
      }
      
      if (parsedError && typeof parsedError === 'object' && parsedError.severity) {
        const sev = parsedError.severity.toLowerCase();
        if (sev === 'warning') severity = 'warning';
        else if (sev === 'success') severity = 'success';
      }
    } else if (error && error.message) {
      message = error.message;
    }

    this.showDialog(message, title, severity);
  }
}
