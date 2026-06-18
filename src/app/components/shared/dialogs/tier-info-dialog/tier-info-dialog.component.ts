import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-tier-info-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './tier-info-dialog.component.html',
  styleUrls: ['./tier-info-dialog.component.scss']
})
export class TierInfoDialogComponent {
  private dialogRef = inject(MatDialogRef<TierInfoDialogComponent>);

  onClose(): void {
    this.dialogRef.close();
  }
}
