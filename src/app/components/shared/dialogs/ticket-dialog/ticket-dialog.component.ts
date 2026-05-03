import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-ticket-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule
  ],
  templateUrl: './ticket-dialog.component.html',
  styleUrls: ['./ticket-dialog.component.scss']
})
export class TicketDialogComponent implements OnInit {
  private fb = inject(FormBuilder);
  private dialogRef = inject(MatDialogRef<TicketDialogComponent>);
  public data = inject(MAT_DIALOG_DATA);

  ticketForm!: FormGroup;
  isEditMode: boolean = false;

  ngOnInit(): void {
    this.isEditMode = !!this.data?.ticket;
    this.initForm();
  }

  private initForm(): void {
    this.ticketForm = this.fb.group({
      name: [this.data?.ticket?.name || '', [Validators.required]],
      price: [this.data?.ticket?.price || '', [Validators.required, Validators.min(0)]],
      maxPrice: [this.data?.ticket?.maxPrice || '', [Validators.required, Validators.min(0)]],
      royalties: [this.data?.ticket?.royalties || '', [Validators.required, Validators.min(0), Validators.max(100)]],
      venueZone: [this.data?.ticket?.venueZone || '', [Validators.required]],
      totalQuantity: [this.data?.ticket?.totalQuantity || '', [Validators.required, Validators.min(1)]]
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSubmit(): void {
    if (this.ticketForm.valid) {
      this.dialogRef.close(this.ticketForm.value);
    }
  }
}
