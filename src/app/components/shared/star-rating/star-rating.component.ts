import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-star-rating',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './star-rating.component.html',
  styleUrls: ['./star-rating.component.scss']
})
export class StarRatingComponent {
  @Input() rating: number = 0;
  @Input() readonly: boolean = true;
  @Input() size: 'small' | 'medium' | 'large' = 'medium';
  @Output() ratingChanged = new EventEmitter<number>();

  readonly maxRating = 5;
  readonly starSteps = [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];

  get stars() {
    const stars = [];
    for (let i = 1; i <= this.maxRating; i++) {
      const starValue = i;
      const previousStarValue = i - 0.5;
      
      if (this.rating >= starValue) {
        stars.push({ value: starValue, state: 'full' });
      } else if (this.rating >= previousStarValue) {
        stars.push({ value: previousStarValue, state: 'half' });
      } else {
        stars.push({ value: starValue, state: 'empty' });
      }
    }
    return stars;
  }

  get sizeClass(): string {
    return `star-rating--${this.size}`;
  }

  onStarClick(value: number): void {
    if (this.readonly) return;
    this.ratingChanged.emit(value);
  }

  onStarHover(value: number): void {
    if (this.readonly) return;
    // Optional: Add hover effect preview
  }
}
