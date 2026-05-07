import {
  Component,
  Input,
  OnInit,
  OnDestroy,
  forwardRef,
  inject,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  NG_VALUE_ACCESSOR,
  ControlValueAccessor,
  Validators,
} from "@angular/forms";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatDatepickerModule } from "@angular/material/datepicker";
import {
  MatNativeDateModule,
  MAT_DATE_LOCALE,
  MAT_DATE_FORMATS,
} from "@angular/material/core";
import { MatIconModule } from "@angular/material/icon";
import { Subject } from "rxjs";
import { takeUntil } from "rxjs/operators";

/** Display format: dd/MM/yyyy. The adapter still works with JS Date internally. */
const AR_DATE_FORMATS = {
  parse: {
    dateInput: ['dd/MM/yyyy', 'dd/MM/yy', 'ddMMyyyy'],
  },
  display: {
    dateInput: 'dd/MM/yyyy',
    monthYearLabel: 'MMM yyyy',
    dateA11yLabel: 'dd/MM/yyyy',
    monthYearA11yLabel: 'MMMM yyyy',
  },
};

/**
 * Reusable date-only picker for birthdates / past dates.
 *
 * Emits a date string in ISO format "YYYY-MM-DD".
 * Integrates with Angular Reactive Forms via ControlValueAccessor.
 *
 * Usage:
 *   <app-birthdate-picker formControlName="birthdate" label="Fecha de Nacimiento">
 *   </app-birthdate-picker>
 */
@Component({
  selector: "app-birthdate-picker",
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatIconModule,
  ],
  templateUrl: "./birthdate-picker.component.html",
  styleUrl: "./birthdate-picker.component.scss",
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => BirthdatePickerComponent),
      multi: true,
    },
    { provide: MAT_DATE_LOCALE, useValue: 'es-AR' },
    { provide: MAT_DATE_FORMATS, useValue: AR_DATE_FORMATS },
  ],
})
export class BirthdatePickerComponent
  implements OnInit, OnDestroy, ControlValueAccessor
{
  private fb = inject(FormBuilder);
  private destroy$ = new Subject<void>();

  @Input() label = "Fecha de Nacimiento";

  /** Max selectable date — defaults to today (no future birthdates) */
  maxDate: Date = new Date();

  /** Min selectable date */
  minDate: Date = new Date(1900, 0, 1);

  form!: FormGroup;

  get dateCtrl(): FormControl {
    return this.form.get("date") as FormControl;
  }

  private onChange: (value: string | null) => void = () => {};
  private onTouched: () => void = () => {};

  ngOnInit(): void {
    this.form = this.fb.group({
      date: [null, Validators.required],
    });

    this.form.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.emitValue();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  writeValue(value: string | null): void {
    if (!value || !this.form) return;
    try {
      const dt = new Date(value + "T12:00:00"); // noon to avoid tz issues
      if (!isNaN(dt.getTime())) {
        this.form.patchValue({ date: dt }, { emitEvent: false });
      }
    } catch {
      // ignore
    }
  }

  registerOnChange(fn: (v: string | null) => void): void {
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

  private emitValue(): void {
    const d: Date | null = this.form.value.date;
    if (!d) {
      this.onChange(null);
      return;
    }
    const pad = (n: number) => (n < 10 ? "0" + n : "" + n);
    const iso = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    this.onChange(iso);
  }

  /** Filter — block future dates */
  dateFilter = (d: Date | null): boolean => {
    if (!d) return false;
    return d <= this.maxDate;
  };
}
