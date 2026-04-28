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
  ],
  templateUrl: './create-event.component.html',
  styleUrl: './create-event.component.scss',
})
export class CreateEventComponent {
  private fb = inject(FormBuilder);
  private router = inject(Router);

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
    { value: 'venue1', viewValue: 'Estadio Obras' },
    { value: 'venue2', viewValue: 'Luna Park' },
    { value: 'venue3', viewValue: 'Teatro Colón' },
    { value: 'venue4', viewValue: 'Movistar Arena' }
  ];

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
