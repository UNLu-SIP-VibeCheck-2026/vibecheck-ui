import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-system-logs',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div style="padding: 2rem; text-align: center;">
      <h1>Logs del Sistema</h1>
      <p>Esta funcionalidad está en desarrollo.</p>
    </div>
  `,
  styles: [`
    h1 { color: #333; }
    p { color: #666; }
  `]
})
export class SystemLogsComponent {}
