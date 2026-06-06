import { Component, inject, OnInit, HostListener, signal } from '@angular/core';
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
import { trigger, transition, style, animate } from '@angular/animations';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, MatMenuModule, MatIconModule, MatButtonModule, MatDividerModule, AvatarComponent],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss'],
  animations: [
    trigger('slideInOut', [
      transition(':enter', [
        style({ transform: 'translateX(100%)' }),
        animate('300ms cubic-bezier(0.16, 1, 0.3, 1)', style({ transform: 'translateX(0)' }))
      ]),
      transition(':leave', [
        animate('250ms cubic-bezier(0.16, 1, 0.3, 1)', style({ transform: 'translateX(100%)' }))
      ])
    ]),
    trigger('fade', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('200ms ease-out', style({ opacity: 1 }))
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ opacity: 0 }))
      ])
    ])
  ]
})
export class NavbarComponent implements OnInit {
  private router = inject(Router);
  authService = inject(AuthService);
  private usersService = inject(UsersService);

  user$ = this.authService.currentUser$;
  fullUserProfile = signal<UserPublicResponse | null>(null);

  // States managed by Signals
  isScrolled = signal<boolean>(false);
  isMobileMenuOpen = signal<boolean>(false);

  @HostListener('window:scroll', [])
  onWindowScroll(): void {
    this.isScrolled.set(window.scrollY > 20);
  }

  ngOnInit(): void {
    this.authService.currentUser$.subscribe({
      next: (user) => {
        if (user?.username) {
          this.loadFullUserProfile(user.username);
        } else {
          this.fullUserProfile.set(null);
        }
      }
    });
  }

  private loadFullUserProfile(username: string): void {
    this.usersService.getPublicUser(username).subscribe({
      next: (profile) => {
        this.fullUserProfile.set(profile);
      },
      error: () => {
        // If we can't load the full profile, we'll just use the basic user info
        this.fullUserProfile.set(null);
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

  // A helper function to handle navigation and close the mobile menu
  navigateAndClose(path: string | any[]): void {
    this.isMobileMenuOpen.set(false);
    if (typeof path === 'string') {
      this.router.navigate([path]);
    } else {
      this.router.navigate(path);
    }
  }

  logout(): void {
    this.isMobileMenuOpen.set(false);
    this.authService.logout();
    this.router.navigate(['/']);
  }
}

