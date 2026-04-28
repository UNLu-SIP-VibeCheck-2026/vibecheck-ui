import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-oauth-callback',
  standalone: true,
  template: '',
})
export class OAuthCallbackComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private authService = inject(AuthService);

  constructor() {
    this.handleOAuthCallback();
  }

  private handleOAuthCallback(): void {
    this.route.queryParams.subscribe(params => {
      const accessToken = params['accessToken'];
      const refreshToken = params['refreshToken'];
      
      if (accessToken && refreshToken) {
        try {
          // Guardar los tokens en localStorage
          this.authService.setTokens(accessToken, refreshToken);
          
          // Cargar el usuario desde el access token
          this.authService.loadUserFromToken(accessToken);
          
          // Redirigir al dashboard
          this.router.navigate(['/dashboard']);
        } catch (error) {
          console.error('Error processing OAuth callback:', error);
          this.router.navigate(['/login']);
        }
      } else {
        console.error('No tokens received in OAuth callback');
        this.router.navigate(['/login']);
      }
    });
  }
}
