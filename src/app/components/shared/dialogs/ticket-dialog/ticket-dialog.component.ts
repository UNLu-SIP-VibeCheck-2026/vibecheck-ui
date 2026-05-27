import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatNativeDateModule } from '@angular/material/core';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CommonModule } from '@angular/common';
import { TicketTypeService } from '../../../../services/ticket-type.service';
import {
  TicketTypeCreateRequest,
  TicketTypeUpdateRequest,
  TicketTypeResponse,
} from '../../../../models/ticket-type.model';
import { DateTimePickerComponent } from '../../date-time-picker/date-time-picker.component';
import { MatSnackBar, MatSnackBarModule } from "@angular/material/snack-bar";

export interface TicketDialogData {
  ticket?: TicketTypeResponse;
  eventId?: number;
}

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
    MatSelectModule,
    MatNativeDateModule,
    MatCheckboxModule,
    MatIconModule,
    MatProgressSpinnerModule,
    DateTimePickerComponent
  ],
  templateUrl: './ticket-dialog.component.html',
  styleUrls: ['./ticket-dialog.component.scss']
})
export class TicketDialogComponent implements OnInit {
  private snackBar = inject(MatSnackBar);
  private fb = inject(FormBuilder);
  private dialogRef = inject(MatDialogRef<TicketDialogComponent>);
  private ticketTypeService = inject(TicketTypeService);
  public data: TicketDialogData = inject(MAT_DIALOG_DATA);

  ticketForm!: FormGroup;
  isEditMode: boolean = false;
  isSubmitting: boolean = false;
  errorMessage: string = '';
  minDate: Date = new Date();

  ngOnInit(): void {
    this.isEditMode = !!this.data?.ticket;
    this.initForm();
  }

  private initForm(): void {
    const ticket = this.data?.ticket;
    this.ticketForm = this.fb.group({
      name: [ticket?.name || '', [Validators.required]],
      description: [ticket?.description || '', []],
      priceUsdt: [ticket?.priceUsdt || '', [Validators.required, Validators.min(0)]],
      maxPrice: [ticket?.maxPrice || '', [Validators.required, Validators.min(0)]],
      royalties: [ticket?.royalties || '', [Validators.required, Validators.min(0), Validators.max(100)]],
      maxQuantity: [ticket?.maxQuantity || '', [Validators.required, Validators.min(1)]],
      maxPerUser: [ticket?.maxPerUser || '', [Validators.required, Validators.min(1)]],
      saleStartDate: [ticket?.saleStartDate || '', [Validators.required]],
      saleEndDate: [ticket?.saleEndDate || '', [Validators.required]],
      active: [ticket?.active !== undefined ? ticket.active : true, [Validators.required]],
      hasSeats: [ticket?.hasSeats || false],
      firstRow: [ticket?.firstRow || null],
      lastRow: [ticket?.lastRow || null],
      firstSeat: [ticket?.firstSeat || null],
      lastSeat: [ticket?.lastSeat || null]
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSubmit(): void {
    if (this.ticketForm.invalid || this.isSubmitting) {
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    const formValue = this.ticketForm.value;

    if (formValue.hasSeats) {
        if (!formValue.firstRow || !formValue.lastRow || !formValue.firstSeat || !formValue.lastSeat) {
            this.errorMessage = 'Los rangos de filas y asientos son requeridos si tiene asientos.';
            this.isSubmitting = false;
            return;
        }
        if (formValue.firstRow > formValue.lastRow || formValue.firstSeat > formValue.lastSeat) {
            this.errorMessage = 'Los rangos no son válidos.';
            this.isSubmitting = false;
            return;
        }
    }

    const request: TicketTypeCreateRequest | TicketTypeUpdateRequest = {
      name: formValue.name,
      description: formValue.description || '',
      priceUsdt: Number(formValue.priceUsdt),
      maxPrice: Number(formValue.maxPrice),
      royalties: Number(formValue.royalties),
      maxQuantity: Number(formValue.maxQuantity),
      maxPerUser: Number(formValue.maxPerUser),
      saleStartDate: formValue.saleStartDate, // DateTimePicker ya emite string ISO
      saleEndDate: formValue.saleEndDate, // DateTimePicker ya emite string ISO
      active: formValue.active,
      hasSeats: formValue.hasSeats,
      firstRow: formValue.hasSeats ? Number(formValue.firstRow) : undefined,
      lastRow: formValue.hasSeats ? Number(formValue.lastRow) : undefined,
      firstSeat: formValue.hasSeats ? Number(formValue.firstSeat) : undefined,
      lastSeat: formValue.hasSeats ? Number(formValue.lastSeat) : undefined,
      ...(this.isEditMode ? {} : { eventId: this.data.eventId })
    };

    const call$ = this.isEditMode
      ? this.ticketTypeService.updateTicketType(this.data.ticket!.id, request as TicketTypeUpdateRequest)
      : this.ticketTypeService.createTicketType(request as TicketTypeCreateRequest);

    call$.subscribe({
      next: (ticket: TicketTypeResponse) => {
        this.isSubmitting = false;
        this.dialogRef.close(ticket);
      },
      error: (err) => {
        this.isSubmitting = false;
        this.errorMessage = err?.error?.message || 'Ocurrió un error. Intentá de nuevo.';
      }
    });
  }
}
