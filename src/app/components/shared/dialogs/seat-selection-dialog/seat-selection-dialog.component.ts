import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

export interface SeatSelectionData {
    firstRow: number;
    lastRow: number;
    firstSeat: number;
    lastSeat: number;
}

@Component({
  selector: 'app-seat-selection-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, ReactiveFormsModule],
  templateUrl: './seat-selection-dialog.component.html',
  styleUrls: ['./seat-selection-dialog.component.css']
})
export class SeatSelectionDialogComponent {
  seatForm: FormGroup;

  constructor(
    public dialogRef: MatDialogRef<SeatSelectionDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: SeatSelectionData,
    private fb: FormBuilder
  ) {
    this.seatForm = this.fb.group({
      row: ['', [Validators.required, Validators.min(data.firstRow), Validators.max(data.lastRow)]],
      number: ['', [Validators.required, Validators.min(data.firstSeat), Validators.max(data.lastSeat)]]
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onConfirm(): void {
    if (this.seatForm.valid) {
      this.dialogRef.close({
        row: this.seatForm.value.row.toString(),
        number: this.seatForm.value.number.toString()
      });
    }
  }
}
