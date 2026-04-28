import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';
import { VenueDialogComponent } from '../venue-dialog/venue-dialog.component';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-event-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatIconModule,
    FormsModule
  ],
  templateUrl: './event-dialog.component.html',
  styleUrls: ['./event-dialog.component.scss']
})
export class EventDialogComponent implements OnInit {
  private fb = inject(FormBuilder);
  private dialogRef = inject(MatDialogRef<EventDialogComponent>);
  public data = inject(MAT_DIALOG_DATA);
  private dialog = inject(MatDialog);

  eventForm!: FormGroup;
  isEditMode: boolean = false;

  venues = [
    { id: 'VENUE01', name: 'Estadio Obras', address: 'Av. del Libertador 7395' },
    { id: 'VENUE02', name: 'Luna Park', address: 'Av. Eduardo Madero 420' },
    { id: 'VENUE03', name: 'Teatro Colón', address: 'Cerrito 628' }
  ];
  filteredVenues = [...this.venues];
  venueSearch: string = "";

  ngOnInit(): void {
    this.isEditMode = !!this.data?.event;
    this.initForm();
  }

  private initForm(): void {
    this.eventForm = this.fb.group({
      title: [this.data?.event?.title || '', [Validators.required, Validators.minLength(5)]],
      description: [this.data?.event?.description || '', [Validators.required, Validators.minLength(20)]],
      startDate: [this.data?.event?.startDate || '', [Validators.required]],
      endDate: [this.data?.event?.endDate || '', [Validators.required]],
      venue: [this.data?.event?.venue || '', [Validators.required]],
      status: [this.data?.event?.status || 'PROGRAMADO']
    });
  }

  filterVenues() {
    const search = this.venueSearch.toLowerCase();
    this.filteredVenues = this.venues.filter(v => 
      v.name.toLowerCase().includes(search) || 
      v.address.toLowerCase().includes(search)
    );
  }

  openNewVenueDialog() {
    const dialogRef = this.dialog.open(VenueDialogComponent, {
      width: '450px'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        const newVenue = {
          id: 'NEW_' + Math.random().toString(36).substr(2, 9),
          name: result.name,
          address: result.address
        };
        this.venues.push(newVenue);
        this.filterVenues();
        this.eventForm.patchValue({ venue: newVenue.id });
      }
    });
  }

  cancelEvent(): void {
    const confirmRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Cancelar Evento',
        message: '¿Estás seguro de que deseas cancelar este evento? Esta acción no se puede deshacer.'
      }
    });

    confirmRef.afterClosed().subscribe(result => {
      if (result) {
        this.eventForm.patchValue({ status: 'CANCELADO' });
        this.onSubmit(); // Save the cancellation
      }
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSubmit(): void {
    if (this.eventForm.valid) {
      this.dialogRef.close(this.eventForm.value);
    }
  }
}
