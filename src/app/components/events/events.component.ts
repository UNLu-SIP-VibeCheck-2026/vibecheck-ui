import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';

@Component({
  selector: 'app-events',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule],
  template: `
    <div class="container">
      <div class="header">
        <button mat-icon-button (click)="goBack()">
          <mat-icon>arrow_back</mat-icon>
        </button>
        <h1>Explorar Eventos</h1>
      </div>
      
      <div class="placeholder-content">
        <mat-icon class="big-icon">explore</mat-icon>
        <h2>Próximamente</h2>
        <p>Aquí podrás explorar todos los eventos disponibles.</p>
        <button mat-raised-button color="primary" (click)="goBack()">Volver al Dashboard</button>
      </div>
    </div>
  `,
  styles: [`
    .container { padding: 2rem; max-width: 1200px; margin: 0 auto; }
    .header { display: flex; align-items: center; gap: 1rem; margin-bottom: 2rem; }
    .placeholder-content { 
      display: flex; 
      flex-direction: column; 
      align-items: center; 
      justify-content: center; 
      padding: 5rem; 
      background: white; 
      border-radius: 16px; 
      box-shadow: 0 4px 6px rgba(0,0,0,0.05);
      text-align: center;
    }
    .big-icon { font-size: 5rem; width: 5rem; height: 5rem; margin-bottom: 1.5rem; color: #667eea; }
    h1 { margin: 0; font-weight: 700; color: #ffffff; }
    h2 { margin-bottom: 1rem; color: #4b5563; }
    p { margin-bottom: 2rem; color: #6b7280; font-size: 1.1rem; }
  `]
})
export class EventsComponent {
  constructor(private router: Router) {}
  goBack() { this.router.navigate(['/dashboard']); }
}
