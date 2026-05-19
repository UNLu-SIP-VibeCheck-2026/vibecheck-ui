import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule],
  templateUrl: './empty-state.component.html',
  styleUrl: './empty-state.component.scss'
})
export class EmptyStateComponent {
  /**
   * Nombre del icono de Material Icons a mostrar (ej: 'event_busy', 'inbox', 'search_off')
   */
  @Input() icon: string = 'info';

  /**
   * Título principal del estado vacío.
   */
  @Input() title: string = 'No hay datos';

  /**
   * Descripción o detalle secundario explicativo.
   */
  @Input() description: string = 'No se encontró información disponible en este momento.';

  /**
   * Texto para el botón de llamada a la acción (opcional).
   * Si no se provee, no se renderizará el botón.
   */
  @Input() actionText: string = '';

  /**
   * Evento que se dispara al hacer click en el botón de llamada a la acción.
   */
  @Output() actionClick = new EventEmitter<void>();

  onActionClick(): void {
    this.actionClick.emit();
  }
}
