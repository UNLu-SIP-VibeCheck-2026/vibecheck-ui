import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  inject,
  forwardRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  NG_VALUE_ACCESSOR,
  ControlValueAccessor,
  Validators,
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import {
  MatNativeDateModule,
  MAT_DATE_LOCALE,
  MAT_DATE_FORMATS,
} from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

/** Display format: dd/MM/yyyy — the emitted ISO string is built manually. */
const AR_DATE_FORMATS = {
  parse:   { dateInput: ['dd/MM/yyyy', 'dd/MM/yy'] },
  display: {
    dateInput:          'dd/MM/yyyy',
    monthYearLabel:     'MMM yyyy',
    dateA11yLabel:      'dd/MM/yyyy',
    monthYearA11yLabel: 'MMMM yyyy',
  },
};

/**
 * Reusable date-time picker component.
 *
 * Emits an ISO-8601 LocalDateTime string (e.g. "2026-07-15T20:30:00")
 * and integrates with Angular Reactive Forms via ControlValueAccessor.
 *
 * Usage:
 *   <app-date-time-picker
 *     formControlName="startDate"
 *     label="Inicio del Evento"
 *     [minDate]="today"
 *   ></app-date-time-picker>
 */
@Component({
  selector: 'app-date-time-picker',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatIconModule,
    MatSelectModule,
  ],
  templateUrl: './date-time-picker.component.html',
  styleUrl: './date-time-picker.component.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => DateTimePickerComponent),
      multi: true,
    },
    { provide: MAT_DATE_LOCALE, useValue: 'es-AR' },
    { provide: MAT_DATE_FORMATS, useValue: AR_DATE_FORMATS },
  ],
})
export class DateTimePickerComponent
  implements OnInit, OnDestroy, ControlValueAccessor
{
  private fb = inject(FormBuilder);
  private destroy$ = new Subject<void>();

  /** Label shown above the picker */
  @Input() label = 'Fecha y Hora';

  /** Minimum selectable date (defaults to today) */
  @Input() minDate: Date = new Date();

  /** Maximum selectable date */
  @Input() maxDate: Date | null = null;

  /** Optional: reference date that this picker's value must be strictly after */
  @Input() afterDate?: string;

  /** Emits whenever internal validation changes */
  @Output() validChange = new EventEmitter<boolean>();

  form: FormGroup = new FormGroup({
    date: new FormControl<Date | null>(null, Validators.required),
    hour: new FormControl<string>('', Validators.required),
    minute: new FormControl<string>('', Validators.required),
  });

  errorMessage = '';

  // Generate lists for hour and minute options
  hours: string[] = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  minutes: string[] = Array.from({ length: 12 }, (_, i) => (i * 5).toString().padStart(2, '0'));

  // Typed getters for the template
  get dateCtrl(): FormControl { return this.form.get('date') as FormControl; }
  get hourCtrl(): FormControl { return this.form.get('hour') as FormControl; }
  get minuteCtrl(): FormControl { return this.form.get('minute') as FormControl; }

  // ControlValueAccessor callbacks
  private onChange: (value: string | null) => void = () => {};
  private onTouched: () => void = () => {};

  ngOnInit(): void {
    this.form.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.emitValue();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // --- ControlValueAccessor ---

  writeValue(value: string | null): void {
    if (!value || !this.form) return;
    try {
      const dt = new Date(value);
      if (isNaN(dt.getTime())) return;
      const pad = (n: number) => (n < 10 ? '0' + n : '' + n);
      const h = pad(dt.getHours());
      const m = pad(dt.getMinutes());

      // If the incoming minute is not in the predefined 5-minute list, add it dynamically
      if (!this.minutes.includes(m)) {
        this.minutes.push(m);
        this.minutes.sort();
      }

      this.form.patchValue(
        {
          date: dt,
          hour: h,
          minute: m,
        },
        { emitEvent: false }
      );
    } catch {
      // ignore invalid values
    }
  }

  registerOnChange(fn: (value: string | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    isDisabled ? this.form.disable() : this.form.enable();
  }

  onBlur(): void {
    this.onTouched();
  }

  // --- Internal helpers ---

  private emitValue(): void {
    const { date, hour, minute } = this.form.value;
    this.errorMessage = '';

    if (!date || !hour || !minute) {
      this.onChange(null);
      this.validChange.emit(false);
      return;
    }

    const time = `${hour}:${minute}`;
    const d: Date = new Date(date);
    const pad = (n: number) => (n < 10 ? '0' + n : '' + n);
    const iso = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${time}:00`;

    if (this.form.disabled) {
      this.onChange(iso);
      this.validChange.emit(true);
      return;
    }

    // Validation: must be in the future
    const selected = new Date(iso);
    const now = new Date();
    if (selected <= now) {
      this.errorMessage = 'La fecha y hora deben ser futuras';
      this.onChange(null);
      this.validChange.emit(false);
      return;
    }

    // Validation: must be after the reference date
    if (this.afterDate) {
      const ref = new Date(this.afterDate);
      if (selected <= ref) {
        this.errorMessage = 'Debe ser posterior a la fecha de inicio';
        this.onChange(null);
        this.validChange.emit(false);
        return;
      }
    }

    this.onChange(iso);
    this.validChange.emit(true);
  }


  /** Filter function for the datepicker — disable past dates */
  dateFilter = (d: Date | null): boolean => {
    if (!d) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return d >= today;
  };
}
