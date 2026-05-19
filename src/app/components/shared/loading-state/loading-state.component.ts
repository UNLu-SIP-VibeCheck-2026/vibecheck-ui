import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-loading-state',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './loading-state.component.html',
  styleUrl: './loading-state.component.scss'
})
export class LoadingStateComponent {
  /**
   * Modo de visualización de la carga:
   * - 'spinner': Muestra un spinner circular con efecto glow y gradiente de marca.
   * - 'skeleton': Muestra múltiples tarjetas o filas vacías con animación de brillo.
   */
  @Input() mode: 'spinner' | 'skeleton' = 'skeleton';

  /**
   * Tipo de estructura del skeleton a emular:
   * - 'card': Estructura de tarjeta (ej: eventos, entradas).
   * - 'list': Estructura de fila de lista.
   * - 'detail': Estructura de detalle completo.
   */
  @Input() skeletonType: 'card' | 'list' | 'detail' = 'card';

  /**
   * Cantidad de skeletons a mostrar (solo para modo 'skeleton').
   */
  @Input() count: number = 4;

  /**
   * Clase CSS opcional para envolver el grid de los skeletons.
   * Permite reutilizar estructuras de layouts existentes (ej: 'events-grid').
   */
  @Input() gridClass: string = '';

  /**
   * Retorna un arreglo del tamaño indicado por `count` para iterar en el template.
   */
  get skeletonsArray(): number[] {
    return Array(this.count > 0 ? this.count : 1).fill(0);
  }
}
