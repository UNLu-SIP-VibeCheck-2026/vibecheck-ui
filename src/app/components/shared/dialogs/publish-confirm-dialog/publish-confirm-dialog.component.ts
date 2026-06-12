import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface PublishConfirmDialogData {
  eventTitle: string;
  onChain: boolean;
  executeDeploy?: () => void;
}

@Component({
  selector: 'app-publish-confirm-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  templateUrl: './publish-confirm-dialog.component.html',
  styleUrl: './publish-confirm-dialog.component.scss'
})
export class PublishConfirmDialogComponent {
  public data: PublishConfirmDialogData = inject(MAT_DIALOG_DATA);
  private dialogRef = inject(MatDialogRef<PublishConfirmDialogComponent>);

  onCancel(): void {
    this.dialogRef.close(false);
  }

  onConfirm(): void {
    if (this.data.executeDeploy) {
      this.data.executeDeploy();
    }
    this.dialogRef.close(true);
  }
}
