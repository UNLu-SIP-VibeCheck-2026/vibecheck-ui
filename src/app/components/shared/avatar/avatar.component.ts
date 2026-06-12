import { Component, Input, computed, signal, inject, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { UsersService } from '../../../services/users.service';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ErrorService } from '../../../services/error.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-avatar',
  standalone: true,
  imports: [CommonModule, MatSnackBarModule],
  templateUrl: './avatar.component.html',
  styleUrl: './avatar.component.scss'
})
export class AvatarComponent implements OnInit, OnChanges {
  private sanitizer = inject(DomSanitizer);
  private usersService = inject(UsersService);
  private snackBar = inject(MatSnackBar);
  private errorService = inject(ErrorService);
  private destroyRef = inject(DestroyRef);

  @Input() username: string | null = null;
  @Input() name: string | null = null;
  @Input() lastName: string | null = null;
  @Input() hasImage: boolean = false;
  @Input() size: 'small' | 'medium' | 'large' = 'medium';
  @Input() clickable: boolean = false;
  @Input() isPublic: boolean = false;
  @Output() photoChanged = new EventEmitter<void>();

  profileImage = signal<SafeUrl | null>(null);
  isLoading = signal<boolean>(false);

  initials = computed(() => {
    if (this.name && this.lastName) {
      return (this.name[0] + this.lastName[0]).toUpperCase();
    }
    if (this.username) {
      return this.username[0].toUpperCase();
    }
    return '?';
  });

  ngOnInit(): void {
    if (this.username && this.hasImage) {
      this.loadProfileImage();
    }

    this.usersService.profileUpdated$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((updatedUsername) => {
        if (updatedUsername === this.username && this.hasImage) {
          this.loadProfileImage();
        }
      });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['username'] || changes['hasImage']) && this.username && this.hasImage) {
      this.loadProfileImage();
    }
  }

  private loadProfileImage(): void {
    if (!this.username) return;

    this.isLoading.set(true);
    const getImage$ = this.isPublic 
      ? this.usersService.getPublicUserImage(this.username)
      : this.usersService.getUserImage(this.username);

    getImage$.subscribe({
      next: (blob: Blob) => {
        this.profileImage.set(this.sanitizer.bypassSecurityTrustUrl(URL.createObjectURL(blob)));
        this.isLoading.set(false);
      },
      error: () => {
        this.profileImage.set(null);
        this.isLoading.set(false);
      }
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      this.uploadImage(file);
    }
  }

  private uploadImage(file: File): void {
    if (!this.username) return;

    this.usersService.uploadUserImage(this.username, file).subscribe({
      next: () => {
        this.snackBar.open('Foto de perfil actualizada', 'Cerrar', { duration: 3000 });
        this.loadProfileImage();
        this.photoChanged.emit();
        this.usersService.notifyProfileUpdated(this.username);
      },
      error: (err) => {
        this.errorService.handleError(err, 'Error al actualizar la foto');
      }
    });
  }

  get sizeClass(): string {
    return `avatar-${this.size}`;
  }
}
