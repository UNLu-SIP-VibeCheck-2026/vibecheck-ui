import { Component, inject, OnInit } from "@angular/core";
import {
  FormBuilder,
  FormControl,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  AbstractControl,
  ValidationErrors,
} from "@angular/forms";
import {
  MatDialogRef,
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialog,
} from "@angular/material/dialog";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatButtonModule } from "@angular/material/button";
import { MatSelectModule } from "@angular/material/select";
import { MatIconModule } from "@angular/material/icon";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { ConfirmDialogComponent } from "../confirm-dialog/confirm-dialog.component";
import { DateTimePickerComponent } from "../../date-time-picker/date-time-picker.component";
import { EventService } from "../../../../services/event.service";
import { VenueService } from "../../../../services/venue.service";
import { EventResponse, EventUpdateRequest } from "../../../../models/event.model";
import { VenueResponse } from "../../../../models/venue.model";

export interface EventDialogData {
  event: EventResponse;
  venues?: VenueResponse[];
}

@Component({
  selector: "app-event-dialog",
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatIconModule,
    MatProgressSpinnerModule,
    DateTimePickerComponent,
  ],
  templateUrl: "./event-dialog.component.html",
  styleUrls: ["./event-dialog.component.scss"],
})
export class EventDialogComponent implements OnInit {
  private fb = inject(FormBuilder);
  private dialogRef = inject(MatDialogRef<EventDialogComponent>);
  public data: EventDialogData = inject(MAT_DIALOG_DATA);
  private dialog = inject(MatDialog);
  private eventService = inject(EventService);
  private venueService = inject(VenueService);

  eventForm!: FormGroup;
  isSubmitting = false;
  isCancelling = false;
  errorMessage = "";

  venues: VenueResponse[] = [];
  filteredVenues: VenueResponse[] = [];
  venueSearch = "";

  get isEditMode(): boolean {
    return !!this.data?.event;
  }

  get startDateCtrl(): FormControl {
    return this.eventForm.get("startDate") as FormControl;
  }
  get endDateCtrl(): FormControl {
    return this.eventForm.get("endDate") as FormControl;
  }

  get startDateValue(): string {
    return this.eventForm.get("startDate")?.value || "";
  }

  today = new Date();

  ngOnInit(): void {
    this.initForm();

    // Prefer venues passed from the parent (already loaded), else fetch
    if (this.data?.venues?.length) {
      this.venues = this.data.venues;
      this.filteredVenues = [...this.venues];
    } else {
      this.venueService.findAllVenues(0, 200).subscribe({
        next: (page) => {
          this.venues = page.content;
          this.filteredVenues = [...this.venues];
        },
      });
    }
  }

  private initForm(): void {
    const e = this.data?.event;
    this.eventForm = this.fb.group(
      {
        title: [
          e?.title ?? "",
          [Validators.required, Validators.minLength(5)],
        ],
        description: [
          e?.description ?? "",
          [Validators.required, Validators.minLength(20)],
        ],
        startDate: [e?.startDate ?? "", [Validators.required]],
        endDate: [e?.endDate ?? "", [Validators.required]],
        capacity: [e?.capacity ?? 1000, [Validators.required, Validators.min(1)]],
        active: [e?.active ?? true],
        venueId: [e?.venueId ?? null],
      },
      { validators: [this.endAfterStartValidator] }
    );
  }

  endAfterStartValidator(group: AbstractControl): ValidationErrors | null {
    const start = group.get("startDate")?.value;
    const end = group.get("endDate")?.value;
    if (!start || !end) return null;
    return new Date(end) > new Date(start) ? null : { endBeforeStart: true };
  }

  filterVenues(): void {
    const q = this.venueSearch.toLowerCase();
    this.filteredVenues = this.venues.filter(
      (v) =>
        v.title.toLowerCase().includes(q) ||
        v.coordinates.toLowerCase().includes(q)
    );
  }

  cancelEvent(): void {
    const confirmRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: "Cancelar Evento",
        message:
          "¿Estás seguro de que deseas cancelar este evento? Esta acción no se puede deshacer.",
      },
    });

    confirmRef.afterClosed().subscribe((confirmed: boolean) => {
      if (!confirmed || !this.data?.event) return;
      this.isCancelling = true;
      // Build an update that preserves current data but marks it to cancel
      // The backend will set status based on business logic.
      // We disable the event to signal cancellation.
      const req: EventUpdateRequest = {
        title: this.eventForm.value.title,
        description: this.eventForm.value.description,
        startDate: this.eventForm.value.startDate,
        endDate: this.eventForm.value.endDate,
        capacity: Number(this.eventForm.value.capacity),
        active: false,
        venueId: this.eventForm.value.venueId ?? null,
      };

      this.eventService.updateEvent(this.data.event.id, req).subscribe({
        next: (updated) => {
          this.isCancelling = false;
          this.dialogRef.close(updated);
        },
        error: (err) => {
          this.isCancelling = false;
          this.errorMessage =
            err?.error?.message ?? "Error al cancelar el evento.";
        },
      });
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSubmit(): void {
    if (this.eventForm.invalid || !this.data?.event) return;
    this.isSubmitting = true;
    this.errorMessage = "";

    const req: EventUpdateRequest = {
      title: this.eventForm.value.title,
      description: this.eventForm.value.description,
      startDate: this.eventForm.value.startDate,
      endDate: this.eventForm.value.endDate,
      capacity: Number(this.eventForm.value.capacity),
      active: this.eventForm.value.active,
      venueId: this.eventForm.value.venueId ?? null,
    };

    this.eventService.updateEvent(this.data.event.id, req).subscribe({
      next: (updated) => {
        this.isSubmitting = false;
        this.dialogRef.close(updated);
      },
      error: (err) => {
        this.isSubmitting = false;
        this.errorMessage =
          err?.error?.message ?? "Error al guardar. Intentá de nuevo.";
      },
    });
  }
}
