import { CommonModule } from "@angular/common";
import { Component, inject, OnInit, ViewChild, ElementRef } from "@angular/core";
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
  AbstractControl,
  ValidationErrors,
} from "@angular/forms";
import { MatButtonModule } from "@angular/material/button";
import { MatCardModule } from "@angular/material/card";
import { MatIconModule } from "@angular/material/icon";
import { MatInputModule } from "@angular/material/input";
import { MatSelectModule } from "@angular/material/select";
import { MatChipsModule } from "@angular/material/chips";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { Router } from "@angular/router";
import { MatDialog } from "@angular/material/dialog";
import { FormsModule } from "@angular/forms";
import { MatSnackBar } from "@angular/material/snack-bar";
import { EventService } from "../../services/event.service";
import { VenueService } from "../../services/venue.service";
import { CategoryService } from "../../services/category.service";
import { EventCreateRequest } from "../../models/event.model";
import { VenueResponse } from "../../models/venue.model";
import { CategoryResponse } from "../../models/category.model";
import { DateTimePickerComponent } from "../shared/date-time-picker/date-time-picker.component";
import {
  VenueDialogComponent,
  VenueDialogData,
} from "../shared/dialogs/venue-dialog/venue-dialog.component";

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
    MatProgressSpinnerModule,
    FormsModule,
    DateTimePickerComponent,
  ],
  templateUrl: "./create-event.component.html",
  styleUrl: "./create-event.component.scss",
})
export class CreateEventComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private dialog = inject(MatDialog);
  private eventService = inject(EventService);
  private venueService = inject(VenueService);
  private categoryService = inject(CategoryService);
  private snackBar = inject(MatSnackBar);

  today = new Date();

  eventForm: FormGroup = this.fb.group(
    {
      title: ["", [Validators.required, Validators.minLength(5), Validators.maxLength(100)]],
      description: ["", [Validators.required, Validators.minLength(20), Validators.maxLength(500)]],
      startDate: ["", Validators.required],
      endDate: ["", Validators.required],
      venue: [null, Validators.required],
      categoryIds: [[], Validators.required],
      maxPriceResale: [150, [Validators.required, Validators.min(100)]],
      royaltyBps: [500, [Validators.required, Validators.min(0), Validators.max(10000)]],
    },
    { validators: [this.endAfterStartValidator] }
  );

  isSubmitting = false;
  isLoadingVenues = false;
  selectedCategories: string[] = [];
  selectedImage: File | null = null;
  imagePreview: string | null = null;
  imageError: string = "";

  @ViewChild('imageInput') imageInput!: ElementRef<HTMLInputElement>;

  isLoadingCategories = false;
  categories: CategoryResponse[] = [];

  venues: VenueResponse[] = [];
  filteredVenues: VenueResponse[] = [];
  venueSearch: string = "";

  ngOnInit(): void {
    this.loadVenues();
    this.loadCategories();
  }

  loadCategories(): void {
    this.isLoadingCategories = true;
    this.categoryService.getAllCategories().subscribe({
      next: (data) => {
        this.categories = data;
        this.isLoadingCategories = false;
      },
      error: (err) => {
        console.error("Error cargando categorías:", err);
        this.isLoadingCategories = false;
      }
    });
  }

  loadVenues(): void {
    this.isLoadingVenues = true;
    this.venueService.findAllVenues(0, 200).subscribe({
      next: (page) => {
        this.venues = page.content;
        this.filteredVenues = [...this.venues];
        this.isLoadingVenues = false;
      },
      error: (err) => {
        console.error("Error cargando venues:", err);
        this.isLoadingVenues = false;
      },
    });
  }

  /** Cross-field validator: endDate must be after startDate */
  endAfterStartValidator(group: AbstractControl): ValidationErrors | null {
    const start = group.get("startDate")?.value;
    const end = group.get("endDate")?.value;
    if (!start || !end) return null;
    return new Date(end) > new Date(start) ? null : { endBeforeStart: true };
  }

  /** Helper — returns startDate value for the end picker's afterDate input */
  get startDateValue(): string {
    return this.eventForm.get("startDate")?.value || "";
  }

  filterVenues(): void {
    const search = this.venueSearch.toLowerCase();
    this.filteredVenues = this.venues.filter(
      (v) =>
        v.title.toLowerCase().includes(search) ||
        v.coordinates.toLowerCase().includes(search)
    );
  }

  openNewVenueDialog(): void {
    const dialogRef = this.dialog.open(VenueDialogComponent, {
      width: "500px",
      data: {} as VenueDialogData,
    });

    dialogRef.afterClosed().subscribe((venue: VenueResponse | undefined) => {
      if (venue) {
        this.venues.push(venue);
        this.filteredVenues = [...this.venues];
        this.eventForm.patchValue({ venue: venue.id });
      }
    });
  }

  getSelectedVenueDisplay(): string {
    const venueId = this.eventForm.get("venue")?.value;
    const venue = this.venues.find((v) => v.id === venueId);
    if (!venue) return "";
    return `${venue.title} - ${venue.coordinates} - Cap: ${venue.capacity.toLocaleString()}`;
  }

  onSubmit(): void {
    if (this.eventForm.valid) {
      this.isSubmitting = true;
      const formValue = this.eventForm.value;

      const request: EventCreateRequest = {
        title: formValue.title,
        description: formValue.description,
        startDate: formValue.startDate,
        endDate: formValue.endDate,
        capacity: 1000,
        active: true,
        ownerId: 1,
        venueId: formValue.venue ?? null,
        categoryIds: formValue.categoryIds,
        maxPriceResale: formValue.maxPriceResale,
        royaltyBps: formValue.royaltyBps,
      };

      this.eventService.createEventWithImage(request, this.selectedImage || undefined).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.showSnack("Evento creado correctamente");
          this.router.navigate(["/admin-events"]);
        },
        error: (err) => {
          console.error("Error creating event:", err);
          this.isSubmitting = false;
          const errMsg = err.error?.message || "Error al crear el evento";
          this.showSnack(errMsg, "error");
        },
      });
    }
  }

  triggerImageInput(): void {
    this.imageInput?.nativeElement.click();
  }

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];

      // Validar tamaño: máximo 2MB
      if (file.size < 2 * 1024 * 1024) {
        this.selectedImage = file;
        this.imageError = "";

        // Crear preview
        const reader = new FileReader();
        reader.onload = (e) => {
          this.imagePreview = e.target?.result as string;
        };
        reader.readAsDataURL(file);
      } else {
        this.selectedImage = null;
        this.imagePreview = null;
        this.imageError = "La imagen no puede superar los 2MB";
        input.value = ""; // Limpiar el input
      }
    }
  }

  removeImage(): void {
    this.selectedImage = null;
    this.imagePreview = null;
    this.imageError = "";
  }

  private showSnack(msg: string, type: "success" | "error" = "success"): void {
    this.snackBar.open(msg, "✕", {
      duration: 4000,
      panelClass: type === "error" ? ["snack-error"] : ["snack-success"],
      horizontalPosition: "end",
      verticalPosition: "top",
    });
  }

  cancel(): void {
    this.router.navigate(["/dashboard"]);
  }
}
