import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuditLogResponse } from '../../../../models/audit-log-response.model';

@Component({
  selector: 'app-log-detail-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  templateUrl: './log-detail-dialog.component.html',
  styleUrl: './log-detail-dialog.component.scss'
})
export class LogDetailDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<LogDetailDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { log: AuditLogResponse }
  ) {}

  formatJson(json: string): string {
    if (!json) return '';
    try {
      const obj = JSON.parse(json);
      return JSON.stringify(obj, null, 2);
    } catch (e) {
      return json;
    }
  }
}
