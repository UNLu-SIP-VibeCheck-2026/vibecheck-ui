import { Component, inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-simple-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule],
  template: `
    <div class="simple-dialog">
      <h2 mat-dialog-title>{{ data.title }}</h2>
      <mat-dialog-content>
        <p>{{ data.message }}</p>
        <div class="placeholder-box">
            Próximamente funcional
        </div>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button (click)="onClose()">Cerrar</button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .simple-dialog { padding: 16px; min-width: 300px; }
    .placeholder-box { 
        margin-top: 16px; 
        padding: 24px; 
        background: #f3f4f6; 
        border: 2px dashed #d1d5db; 
        border-radius: 8px; 
        text-align: center; 
        color: #6b7280;
        font-weight: 500;
    }
    h2 { font-weight: 700; margin-bottom: 12px; }
  `]
})
export class SimpleDialogComponent {
  public data = inject(MAT_DIALOG_DATA);
  private dialogRef = inject(MatDialogRef<SimpleDialogComponent>);

  onClose(): void {
    this.dialogRef.close();
  }
}
