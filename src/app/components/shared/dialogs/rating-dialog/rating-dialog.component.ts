import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { StarRatingComponent } from '../../star-rating/star-rating.component';

export interface RatingDialogData {
  organizerName: string;
  eventId: number;
  organizerId: number;
  currentRating?: number;
}

@Component({
  selector: 'app-rating-dialog',
  standalone: true,
  imports: [CommonModule, MatButtonModule, StarRatingComponent],
  templateUrl: './rating-dialog.component.html',
  styleUrls: ['./rating-dialog.component.scss']
})
export class RatingDialogComponent {
  selectedRating: number = 0;
  isSubmitting: boolean = false;

  constructor(
    public dialogRef: MatDialogRef<RatingDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: RatingDialogData
  ) {
    if (data.currentRating !== undefined) {
      this.selectedRating = data.currentRating;
    }
  }

  onRatingChanged(rating: number): void {
    this.selectedRating = rating;
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onConfirm(): void {
    if (this.selectedRating === 0) {
      return;
    }
    this.isSubmitting = true;
    this.dialogRef.close(this.selectedRating);
  }

  get isValid(): boolean {
    return this.selectedRating > 0;
  }
}
