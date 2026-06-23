import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Router, RouterModule } from '@angular/router';
import { ReferralService, ReferralStatsResponse } from '../../services/referral.service';
import { UsersService } from '../../services/users.service';
import { AuthService } from '../../services/auth.service';
import { UserSummaryResponse } from '../../models/user-summary-response.model';

@Component({
  selector: 'app-referrals',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatSnackBarModule,
    MatTableModule,
    MatFormFieldModule,
    MatInputModule
  ],
  templateUrl: './referrals.component.html',
  styleUrls: ['./referrals.component.scss']
})
export class ReferralsComponent implements OnInit {
  private referralService = inject(ReferralService);
  private usersService = inject(UsersService);
  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);

  referralLink = signal<string>('');
  referralCode = signal<string>('');
  stats = signal<ReferralStatsResponse | null>(null);
  hasWallet = signal<boolean>(false);
  isLoading = signal<boolean>(true);
  walletAddress = signal<string>('');

  // Para la recomendación por correo
  inviteEmail = signal<string>('');
  isInviting = signal<boolean>(false);
  myOwnEmail = signal<string>('');

  displayedColumns: string[] = ['username', 'createdAt', 'state', 'txHash'];

  ngOnInit(): void {
    const user = this.authService.getCurrentUserValue();
    if (user?.username) {
      this.loadUserProfileAndReferrals(user.username);
    } else {
      this.isLoading.set(false);
    }
  }

  private loadUserProfileAndReferrals(username: string): void {
    this.usersService.getUserByUsername(username).subscribe({
      next: (profile: UserSummaryResponse) => {
        if (profile.email) {
          this.myOwnEmail.set(profile.email);
        }
        if (profile.walletAddress && profile.walletAddress.trim() !== '') {
          this.hasWallet.set(true);
          this.walletAddress.set(profile.walletAddress);
          this.loadReferralData();
        } else {
          this.hasWallet.set(false);
          this.isLoading.set(false);
        }
      },
      error: (err) => {
        console.error('Error cargando el perfil de usuario:', err);
        this.isLoading.set(false);
        this.snackBar.open('Error al cargar datos del perfil.', 'Cerrar', { duration: 3000 });
      }
    });
  }

  private loadReferralData(): void {
    this.referralService.getMyReferralCode().subscribe({
      next: (res) => {
        this.referralCode.set(res.referralCode);
        this.referralLink.set(res.referralLink);
        
        // Cargar estadísticas
        this.referralService.getReferralStats().subscribe({
          next: (statsRes) => {
            this.stats.set(statsRes);
            this.isLoading.set(false);
          },
          error: (err) => {
            console.error('Error cargando estadísticas de referidos:', err);
            this.isLoading.set(false);
          }
        });
      },
      error: (err) => {
        console.error('Error cargando código de referidos:', err);
        this.isLoading.set(false);
      }
    });
  }

  copyLink(): void {
    if (!this.referralLink()) return;
    navigator.clipboard.writeText(this.referralLink()).then(() => {
      this.snackBar.open('¡Enlace de referido copiado al portapapeles!', '✕', {
        duration: 3000,
        panelClass: ['snack-success']
      });
    }).catch(err => {
      console.error('Fallo al copiar enlace:', err);
      this.snackBar.open('No se pudo copiar el enlace automáticamente.', '✕', { duration: 3000 });
    });
  }

  navigateToWallet(): void {
    this.router.navigate(['/wallet']);
  }

  sendRecommendation(): void {
    const emailToInvite = this.inviteEmail().trim();
    if (!emailToInvite) {
      this.snackBar.open('Por favor, ingresá un correo electrónico válido.', '✕', { duration: 3000 });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailToInvite)) {
      this.snackBar.open('Formato de correo electrónico inválido.', '✕', { duration: 3000 });
      return;
    }

    if (emailToInvite.toLowerCase() === this.myOwnEmail().toLowerCase()) {
      this.snackBar.open('No podés recomendarte a vos mismo.', '✕', { duration: 3000 });
      return;
    }

    this.isInviting.set(true);
    this.referralService.recommend(emailToInvite).subscribe({
      next: () => {
        this.isInviting.set(false);
        this.inviteEmail.set('');
        this.snackBar.open('¡Recomendación enviada con éxito por correo!', '✕', {
          duration: 4000,
          panelClass: ['snack-success']
        });
      },
      error: (err) => {
        this.isInviting.set(false);
        console.error('Error al enviar la recomendación:', err);
        
        let errorMsg = 'No se pudo enviar la recomendación. Inténtalo de nuevo.';
        if (err.error && err.error.message) {
          errorMsg = err.error.message;
        } else if (typeof err.error === 'string') {
          errorMsg = err.error;
        }
        
        this.snackBar.open(errorMsg, '✕', { duration: 4000 });
      }
    });
  }

  getCompletedReferralsCount(): number {
    if (!this.stats()) return 0;
    return this.stats()!.referrals.filter(r => r.state === 'COMPLETED').length;
  }

  getReferralProgressPercentage(): number {
    if (!this.stats()) return 0;
    const max = this.stats()!.maxReferrals || 1;
    const current = this.getCompletedReferralsCount();
    const pct = (current / max) * 100;
    return Math.min(pct, 100);
  }
}
