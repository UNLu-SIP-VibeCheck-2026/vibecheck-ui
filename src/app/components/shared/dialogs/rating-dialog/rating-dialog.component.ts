import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
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
  imports: [CommonModule, FormsModule, MatButtonModule, MatDialogModule, StarRatingComponent],
  templateUrl: './rating-dialog.component.html',
  styleUrls: ['./rating-dialog.component.scss']
})
export class RatingDialogComponent {
  selectedRating: number = 0;
  ratingText: string = '';
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
    this.dialogRef.close({
      ratingValue: this.selectedRating,
      ratingText: this.ratingText.trim() || undefined
    });
  }

  get isValid(): boolean {
    return this.selectedRating > 0 && this.ratingText.length <= 500;
  }
}
