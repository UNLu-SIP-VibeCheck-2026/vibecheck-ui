import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HistoryService } from '../../services/history.service';
import { AuthService } from '../../services/auth.service';
import { UserHistoryItem } from '../../models/user-history.model';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

@Component({
  selector: 'app-perfil-user-history',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatSnackBarModule
  ],
  templateUrl: './perfil-user-history.component.html',
  styleUrl: './perfil-user-history.component.scss'
})
export class PerfilUserHistoryComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private historyService = inject(HistoryService);
  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);

  username = signal<string>('');
  historyItems = signal<UserHistoryItem[]>([]);
  isLoading = signal<boolean>(true);
  hasError = signal<boolean>(false);

  isOwnProfile = computed(() => {
    const currentUser = this.authService.getCurrentUserValue();
    return this.username().toLowerCase() === currentUser?.username.toLowerCase();
  });

  // Pagination states
  currentPage = signal<number>(0);
  pageSize = 10;
  totalPages = signal<number>(0);
  totalElements = signal<number>(0);
  isFirstPage = signal<boolean>(true);
  isLastPage = signal<boolean>(true);

  ngOnInit(): void {
    const usernameParam = this.route.snapshot.paramMap.get('username');
    if (!usernameParam) {
      this.hasError.set(true);
      this.isLoading.set(false);
      return;
    }
    this.username.set(usernameParam);
    this.loadHistoryPage(0);
  }

  loadHistoryPage(page: number): void {
    this.isLoading.set(true);
    this.hasError.set(false);

    this.historyService.getUserHistory(this.username(), page, this.pageSize, 'attendedAt,desc').subscribe({
      next: (res) => {
        this.historyItems.set(res.content ?? []);
        this.currentPage.set(res.number);
        this.totalPages.set(res.totalPages);
        this.totalElements.set(res.totalElements);
        this.isFirstPage.set(res.first);
        this.isLastPage.set(res.last);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error al cargar historial completo:', err);
        this.hasError.set(true);
        this.isLoading.set(false);
      }
    });
  }

  nextPage(): void {
    if (!this.isLastPage()) {
      this.loadHistoryPage(this.currentPage() + 1);
    }
  }

  prevPage(): void {
    if (!this.isFirstPage()) {
      this.loadHistoryPage(this.currentPage() - 1);
    }
  }

  goBack(): void {
    this.router.navigate(['/perfil-user', this.username()]);
  }

  toggleVisibility(item: UserHistoryItem): void {
    if (!this.isOwnProfile() || !item.id) return;

    const newVisibility = !item.publicVisibility;
    this.historyService.updateVisibility(item.id, newVisibility).subscribe({
      next: (updatedItem) => {
        this.historyItems.update((list) =>
          list.map((x) => (x.id === item.id ? { ...x, publicVisibility: updatedItem.publicVisibility } : x))
        );
        this.snackBar.open(
          updatedItem.publicVisibility
            ? 'Entrada configurada como pública'
            : 'Entrada configurada como privada',
          'Cerrar',
          { duration: 2500 }
        );
      },
      error: (err) => {
        console.error('Error al cambiar visibilidad:', err);
        const errMsg = err.error?.message || 'Error al cambiar la visibilidad de la entrada';
        this.snackBar.open(errMsg, 'Cerrar', { duration: 3000 });
      }
    });
  }

  formatHistoryDate(dateStr: string | null | undefined): string {
    if (!dateStr) return "—";

    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return dateStr;

    const formatted = date.toLocaleString("es-AR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });

    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  }

  shortHistoryValue(value: string | number | null | undefined): string {
    if (value === null || value === undefined || value === '') return "—";
    const text = String(value);
    return text.length > 18 ? `${text.slice(0, 10)}...${text.slice(-6)}` : text;
  }
}
