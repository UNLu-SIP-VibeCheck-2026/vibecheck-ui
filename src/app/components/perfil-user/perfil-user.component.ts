import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { UsersService } from '../../services/users.service';
import { UserPublicResponse } from '../../models/user-public-response.model';
import { MatSnackBar, MatSnackBarModule } from "@angular/material/snack-bar";

@Component({
  selector: 'app-perfil-user',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './perfil-user.component.html',
  styleUrl: './perfil-user.component.scss'
})
export class PerfilUserComponent implements OnInit {
  private snackBar = inject(MatSnackBar);
  private route = inject(ActivatedRoute);
  private usersService = inject(UsersService);

  profile = signal<UserPublicResponse | null>(null);
  isLoading = signal<boolean>(true);
  hasError = signal<boolean>(false);

  fullName = computed(() => {
    const p = this.profile();
    if (!p) return '';
    return `${p.name || ''} ${p.lastName || ''}`.trim();
  });

  initials = computed(() => {
    const p = this.profile();
    if (!p) return '?';
    const n = p.name?.[0] ?? '';
    const l = p.lastName?.[0] ?? '';
    return (n + l).toUpperCase() || p.username?.[0]?.toUpperCase() || '?';
  });

  ngOnInit(): void {
    const username = this.route.snapshot.paramMap.get('username');
    if (!username) {
      this.hasError.set(true);
      this.isLoading.set(false);
      return;
    }

    this.usersService.getPublicUser(username).subscribe({
      next: (data) => {
        this.profile.set(data);
        this.isLoading.set(false);
      },
      error: () => {
        this.hasError.set(true);
        this.isLoading.set(false);
      }
    });
  }
}
