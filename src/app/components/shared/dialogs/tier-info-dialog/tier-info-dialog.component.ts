import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { DiscountService, TierConfigResponse } from '../../../../services/discount.service';

@Component({
  selector: 'app-tier-info-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './tier-info-dialog.component.html',
  styleUrls: ['./tier-info-dialog.component.scss']
})
export class TierInfoDialogComponent implements OnInit {
  private dialogRef = inject(MatDialogRef<TierInfoDialogComponent>);
  private discountService = inject(DiscountService);

  tiers = signal<TierConfigResponse[]>([]);
  isLoading = signal<boolean>(true);

  tierImageMap: Record<string, string> = {
    'BRONCE': 'BRONZE',
    'BRONZE': 'BRONZE',
    'PLATA': 'SILVER',
    'SILVER': 'SILVER',
    'ORO': 'GOLD',
    'GOLD': 'GOLD',
    'PLATINO': 'PLATINUM',
    'PLATINUM': 'PLATINUM'
  };

  getTierImageKey(tier: string): string {
    return this.tierImageMap[tier.toUpperCase()] || 'BRONZE';
  }

  ngOnInit() {
    this.discountService.getTiersConfig().subscribe({
      next: (config) => {
        config.sort((a, b) => a.minPoints - b.minPoints);
        this.tiers.set(config);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error fetching tiers configuration:', err);
        this.isLoading.set(false);
      }
    });
  }

  onClose(): void {
    this.dialogRef.close();
  }
}
