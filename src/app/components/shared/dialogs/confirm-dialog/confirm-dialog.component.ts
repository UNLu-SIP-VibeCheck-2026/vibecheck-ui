import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule],
  templateUrl: './confirm-dialog.component.html',
  styleUrl: './confirm-dialog.component.scss'
})
export class ConfirmDialogComponent {
  public data = inject(MAT_DIALOG_DATA);
  private dialogRef = inject(MatDialogRef<ConfirmDialogComponent>);

  onCancel(): void {
    this.dialogRef.close(false);
  }

  onConfirm(): void {
    this.dialogRef.close(true);
  }

  isDestructive(): boolean {
    if (this.data.danger || this.data.isDestructive) {
      return true;
    }
    if (this.data.success === true) {
      return false;
    }
    
    const text = (this.data.confirmText || '').toLowerCase();
    const title = (this.data.title || '').toLowerCase();
    const msg = (this.data.message || '').toLowerCase();
    
    const destructiveTerms = ['eliminar', 'borrar', 'rechazar', 'cancelar', 'baja', 'remover', 'suspender'];
    return destructiveTerms.some(term => 
      text.includes(term) || title.includes(term) || msg.includes(term)
    );
  }
}
