import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { UsersService } from '../../services/users.service';
import { UserPublicResponse } from '../../models/user-public-response.model';

@Component({
  selector: 'app-perfil-user',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './perfil-user.component.html',
  styleUrl: './perfil-user.component.scss'
})
export class PerfilUserComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private usersService = inject(UsersService);

  profile: UserPublicResponse | null = null;
  isLoading = true;
  hasError = false;

  ngOnInit(): void {
    const username = this.route.snapshot.paramMap.get('username');
    if (!username) {
      this.hasError = true;
      this.isLoading = false;
      return;
    }

    this.usersService.getPublicUser(username).subscribe({
      next: (data) => {
        this.profile = data;
        this.isLoading = false;
      },
      error: () => {
        this.hasError = true;
        this.isLoading = false;
      }
    });
  }

  get fullName(): string {
    if (!this.profile) return '';
    return `${this.profile.name} ${this.profile.lastName}`.trim();
  }

  get initials(): string {
    if (!this.profile) return '?';
    const n = this.profile.name?.[0] ?? '';
    const l = this.profile.lastName?.[0] ?? '';
    return (n + l).toUpperCase() || this.profile.username[0].toUpperCase();
  }
}
