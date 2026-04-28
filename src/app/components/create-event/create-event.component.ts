import { CommonModule } from "@angular/common";
import { Component, inject } from "@angular/core";
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";
import { MatButtonModule } from "@angular/material/button";
import { MatCardModule } from "@angular/material/card";
import { MatIconModule } from "@angular/material/icon";
import { MatInputModule } from "@angular/material/input";
import { MatSelectModule } from "@angular/material/select";
import { MatChipsModule } from "@angular/material/chips";
import { Router } from "@angular/router";
import { MatDialog } from "@angular/material/dialog";
import { VenueDialogComponent } from "../shared/dialogs/venue-dialog/venue-dialog.component";
import { FormsModule } from "@angular/forms";

@Component({
  selector: "app-create-event",
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatChipsModule,
    FormsModule
  ],
  templateUrl: './create-event.component.html',
  styleUrl: './create-event.component.scss',
})
export class CreateEventComponent {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private dialog = inject(MatDialog);

  eventForm: FormGroup = this.fb.group({
    title: ["", [Validators.required, Validators.minLength(5)]],
    description: ["", [Validators.required, Validators.minLength(20)]],
    startDay: ["", [Validators.required, Validators.min(1), Validators.max(31)]],
    startMonth: ["", [Validators.required, Validators.min(1), Validators.max(12)]],
    startYear: ["", [Validators.required, Validators.min(2024)]],
    startTime: ["", Validators.required],
    endDay: ["", [Validators.required, Validators.min(1), Validators.max(31)]],
    endMonth: ["", [Validators.required, Validators.min(1), Validators.max(12)]],
    endYear: ["", [Validators.required, Validators.min(2024)]],
    endTime: ["", Validators.required],
    venue: ["", Validators.required],
    category: ["", Validators.required],
  });

  isSubmitting = false;
  selectedCategories: string[] = ["Categoría 1", "Categoría 2", "Categoría 3"];

  categories = [
    { value: 'musica', viewValue: 'Música' },
    { value: 'teatro', viewValue: 'Teatro' },
    { value: 'deportes', viewValue: 'Deportes' },
    { value: 'conferencia', viewValue: 'Conferencia' },
    { value: 'otros', viewValue: 'Otros' }
  ];

  venues = [
    { id: 'venue1', name: 'Estadio Obras', address: 'Av. del Libertador 7395' },
    { id: 'venue2', name: 'Luna Park', address: 'Av. Eduardo Madero 420' },
    { id: 'venue3', name: 'Teatro Colón', address: 'Cerrito 628' },
    { id: 'venue4', name: 'Movistar Arena', address: 'Humboldt 450' }
  ];
  filteredVenues = [...this.venues];
  venueSearch: string = "";

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

  onSubmit(): void {
    if (this.eventForm.valid) {
      this.isSubmitting = true;
      console.log("Creating event:", this.eventForm.value);
      
      setTimeout(() => {
        this.isSubmitting = false;
        this.router.navigate(['/admin-events']);
      }, 1500);
    }
  }

  cancel(): void {
    this.router.navigate(['/dashboard']);
  }

  removeCategory(cat: string): void {
    this.selectedCategories = this.selectedCategories.filter(c => c !== cat);
  }
}
// Force rebuild
