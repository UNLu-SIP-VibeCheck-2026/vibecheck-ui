import { CommonModule } from "@angular/common";
import { Component, inject, OnInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { MatTableModule } from "@angular/material/table";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatTooltipModule } from "@angular/material/tooltip";
import { EventService } from "../../services/event.service";
import { OrganizerEventMetrics } from "../../models/organizer-metrics.model";
import { LoadingStateComponent } from "../shared/loading-state/loading-state.component";
import { trackLoading } from "../../utils/loading.operator";
import { BaseChartDirective } from "ng2-charts";
import { MatSelectModule } from "@angular/material/select";
import { Chart, registerables, ChartConfiguration } from "chart.js";

Chart.register(...registerables);

@Component({
  selector: "app-organizer-metrics",
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    LoadingStateComponent,
    MatSelectModule,
    BaseChartDirective,
  ],
  templateUrl: "./organizer-metrics.component.html",
  styleUrl: "./organizer-metrics.component.scss",
})
export class OrganizerMetricsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private eventService = inject(EventService);

  eventId = 0;
  metrics: OrganizerEventMetrics | null = null;
  isLoading = false;
  errorMessage: string | null = null;

  // View state and chart controls
  currentView: 'table' | 'chart' = 'table';
  chartType: 'pie' | 'doughnut' | 'bar' = 'pie';
  chartData: ChartConfiguration<'pie' | 'doughnut' | 'bar'>['data'] | null = null;

  displayedColumnsTiers: string[] = [
    "name",
    "price",
    "sold",
    "available",
    "max",
    "revenue",
  ];

  displayedColumnsSales: string[] = [
    "ticketId",
    "tokenId",
    "category",
    "wallet",
    "paid",
    "date",
    "status",
  ];

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get("id");
    this.eventId = idParam ? +idParam : 0;
    if (this.eventId) {
      this.loadMetrics();
    } else {
      this.errorMessage = "ID de evento no válido";
    }
  }

  loadMetrics(): void {
    this.eventService
      .getOrganizerMetrics(this.eventId)
      .pipe(trackLoading((loading) => (this.isLoading = loading)))
      .subscribe({
        next: (res) => {
          this.metrics = res;
          this.updateChartData();
          this.errorMessage = null;
        },
        error: (err) => {
          console.error("Error cargando métricas:", err);
          this.errorMessage =
            err?.error?.message ||
            "No se pudieron cargar las métricas del evento. Verifica tus permisos.";
        },
      });
  }

  updateChartData(): void {
    if (!this.metrics) return;

    const labels = this.metrics.ticketTypes.map(t => t.name);
    const data = this.metrics.ticketTypes.map(t => t.quantitySold);

    this.chartData = {
      labels: labels,
      datasets: [
        {
          label: 'Entradas Vendidas',
          data: data,
          backgroundColor: [
            'rgba(168, 85, 247, 0.65)',  // Violeta
            'rgba(59, 130, 246, 0.65)',   // Azul
            'rgba(16, 185, 129, 0.65)',   // Verde
            'rgba(6, 182, 212, 0.65)',    // Cyan
            'rgba(249, 115, 22, 0.65)',   // Naranja
            'rgba(239, 68, 68, 0.65)'     // Rojo
          ],
          borderColor: [
            '#a855f7',
            '#3b82f6',
            '#10b981',
            '#06b6d4',
            '#f97316',
            '#ef4444'
          ],
          borderWidth: 1
        }
      ]
    };
  }

  getChartOptions(): ChartConfiguration['options'] {
    const isBar = this.chartType === 'bar';
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: !isBar,
          position: 'bottom',
          labels: {
            color: '#e2e8f0',
            font: { family: 'Outfit, sans-serif', size: 12 }
          }
        },
        tooltip: {
          backgroundColor: '#1e1b4b',
          titleColor: '#ffffff',
          bodyColor: '#e2e8f0',
          borderColor: 'rgba(255,255,255,0.1)',
          borderWidth: 1,
          callbacks: {
            label: (context) => {
              const label = context.label || '';
              const val = context.raw || 0;
              return ` ${label}: ${val} vendidas`;
            }
          }
        }
      },
      scales: isBar ? {
        x: {
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: { color: '#94a3b8' }
        },
        y: {
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: { color: '#94a3b8', stepSize: 1 }
        }
      } : undefined
    };
  }

  get occupancyRate(): number {
    if (!this.metrics || this.metrics.totalCapacity === 0) return 0;
    return Math.round(
      (this.metrics.totalTicketsSold / this.metrics.totalCapacity) * 100
    );
  }

  goBack(): void {
    this.router.navigate(["/admin-events"]);
  }

  formatDate(dateString: string | null | undefined): string {
    if (!dateString) return "—";
    try {
      return new Date(dateString).toLocaleString("es-AR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateString;
    }
  }

  getStatusClass(status: string): string {
    switch (status?.toUpperCase()) {
      case "DRAFT":
        return "status-draft";
      case "DEPLOYED":
        return "status-deployed";
      case "PUBLIC":
      case "ACTIVE":
        return "status-public";
      case "FINISHED":
      case "REDEEMED":
        return "status-completed";
      case "CANCELLED":
        return "status-cancelled";
      default:
        return "";
    }
  }

  getStatusLabel(status: string): string {
    const map: Record<string, string> = {
      DRAFT: "BORRADOR",
      DEPLOYED: "DEPLOYADO",
      PUBLIC: "PÚBLICO",
      ACTIVE: "ACTIVO",
      FINISHED: "FINALIZADO",
      REDEEMED: "REDIMIDO",
      CANCELLED: "CANCELADO",
    };
    return map[status?.toUpperCase()] ?? status ?? "—";
  }
}
