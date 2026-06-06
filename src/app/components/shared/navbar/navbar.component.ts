import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { AuthService } from '../../../services/auth.service';
import { UsersService } from '../../../services/users.service';
import { UserPublicResponse } from '../../../models/user-public-response.model';
import { AvatarComponent } from '../avatar/avatar.component';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, MatMenuModule, MatIconModule, MatButtonModule, MatDividerModule, AvatarComponent],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent implements OnInit {
  private router = inject(Router);
  authService = inject(AuthService);
  private usersService = inject(UsersService);

  user$ = this.authService.currentUser$;
  fullUserProfile: UserPublicResponse | null = null;

  ngOnInit(): void {
    this.authService.currentUser$.subscribe({
      next: (user) => {
        if (user?.username) {
          this.loadFullUserProfile(user.username);
        } else {
          this.fullUserProfile = null;
        }
      }
    });
  }

  private loadFullUserProfile(username: string): void {
    this.usersService.getPublicUser(username).subscribe({
      next: (profile) => {
        this.fullUserProfile = profile;
      },
      error: () => {
        // If we can't load the full profile, we'll just use the basic user info
        this.fullUserProfile = null;
      }
    });
  }

  onProfilePhotoChanged(): void {
    const user = this.authService.getCurrentUserValue();
    if (user?.username) {
      this.loadFullUserProfile(user.username);
    }
  }

  navigateToLogin(): void {
    this.router.navigate(['/login']);
  }

  navigateToRegister(): void {
    this.router.navigate(['/register']);
  }

  navigateToHome(): void {
    this.router.navigate(['/']);
  }

  navigateToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }

  navigateToPerfilConfig(): void {
    this.router.navigate(['/perfil-config']);
  }

  navigateToMyPublicProfile(): void {
    const user = this.authService.getCurrentUserValue();
    if (user?.username) {
      this.router.navigate(['/perfil-user', user.username]);
    }
  }

  navigateToMyListings(): void {
    this.router.navigate(['/my-listings']);
  }

  navigateToMarketplace(): void {
    this.router.navigate(['/marketplace']);
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/']);
  }
}
