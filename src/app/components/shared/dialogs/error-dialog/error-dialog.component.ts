import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';

export interface ErrorDialogData {
  title: string;
  message: string;
  severity?: 'error' | 'warning' | 'success';
}

@Component({
  selector: 'app-error-dialog',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatDialogModule],
  templateUrl: './error-dialog.component.html',
  styleUrls: ['./error-dialog.component.scss']
})
export class ErrorDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<ErrorDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ErrorDialogData
  ) {}

  close(): void {
    this.dialogRef.close();
  }

  getIcon(): string {
    const sev = this.data.severity || 'error';
    if (sev === 'warning') return 'warning';
    if (sev === 'success') return 'check_circle';
    return 'error_outline';
  }
}
