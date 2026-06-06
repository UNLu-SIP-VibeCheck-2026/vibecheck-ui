import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { BaseChartDirective } from 'ng2-charts';
import { Chart, registerables, ChartConfiguration } from 'chart.js';
import { StatisticsService } from '../../services/statistics.service';
import {
  OperationalSummaryDTO,
  EventRankingItemDTO,
  FinancialSummaryDTO,
  TokenStatsDTO,
  ScalpingWarningDTO,
  AdvertisingTimeSeriesDTO
} from '../../models/statistics.model';

import { Router } from '@angular/router';
import { MatTooltipModule } from '@angular/material/tooltip';

Chart.register(...registerables);

@Component({
  selector: 'app-admin-statistics',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatTabsModule,
    MatSelectModule,
    MatTableModule,
    MatProgressSpinnerModule,
    MatProgressBarModule,
    BaseChartDirective,
    MatTooltipModule
  ],
  templateUrl: './admin-statistics.component.html',
  styleUrl: './admin-statistics.component.scss'
})
export class AdminStatisticsComponent implements OnInit {
  private statisticsService = inject(StatisticsService);
  private router = inject(Router);

  // States
  isLoading = false;
  errorMessage: string | null = null;
  rankingLimit = 10;

  // Filter periods
  selectedPeriod = 'month';
  startDate = '';
  endDate = '';

  // Data bindings
  operationalSummary: OperationalSummaryDTO | null = null;
  eventsRanking: EventRankingItemDTO[] = [];
  financialSummary: FinancialSummaryDTO | null = null;
  tokenStats: TokenStatsDTO | null = null;
  scalpingWarnings: ScalpingWarningDTO[] = [];

  // Table Columns
  displayedRankingColumns: string[] = ['name', 'status', 'sold', 'capacity', 'occupancy', 'advertising'];
  displayedWarningColumns: string[] = ['ticketId', 'buyerWallet', 'eventName', 'purchased', 'resell', 'minutes', 'severity'];

  // Chart Configurations
  // 1. Line Chart: Advertising Time Series
  public lineChartData: ChartConfiguration<'line'>['data'] = {
    datasets: [],
    labels: []
  };
  public lineChartOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true, labels: { color: '#ffffff' } },
      tooltip: { mode: 'index', intersect: false }
    },
    scales: {
      x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#8f9bb3' } },
      y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#8f9bb3' } }
    }
  };

  // 2. Doughnut Chart: Financial Revenue Distribution
  public doughnutChartData: ChartConfiguration<'doughnut'>['data'] = {
    datasets: [],
    labels: []
  };
  public doughnutChartOptions: ChartConfiguration<'doughnut'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'right', labels: { color: '#ffffff' } }
    }
  };

  // 3. VBK Staking Chart
  public stakingChartData: ChartConfiguration<'doughnut'>['data'] = {
    datasets: [],
    labels: []
  };
  public stakingChartOptions: ChartConfiguration<'doughnut'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom', labels: { color: '#ffffff' } }
    }
  };

  // 4. VBK Supply Evolution Chart
  public supplyChartData: ChartConfiguration<'line'>['data'] = {
    datasets: [],
    labels: []
  };
  public supplyChartOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true, labels: { color: '#ffffff' } }
    },
    scales: {
      x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#8f9bb3' } },
      y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#8f9bb3' }, min: 80000000, max: 100000000 }
    }
  };

  // 5. Event Status Chart
  public eventStatusChartData: ChartConfiguration<'bar'>['data'] = {
    datasets: [],
    labels: []
  };
  public eventStatusChartOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false }
    },
    scales: {
      x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#8f9bb3' } },
      y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#8f9bb3' } }
    }
  };

  ngOnInit(): void {
    // Initial period setup (current month by default)
    this.onPeriodChange('month');
  }

  onPeriodChange(period: string): void {
    this.selectedPeriod = period;
    const today = new Date();
    let start = new Date();

    if (period === 'today') {
      start = today;
    } else if (period === 'week') {
      const day = today.getDay();
      const diff = today.getDate() - day + (day === 0 ? -6 : 1); // Monday
      start = new Date(today.setDate(diff));
    } else if (period === 'month') {
      start = new Date(today.getFullYear(), today.getMonth(), 1);
    } else if (period === '30days') {
      start = new Date(today.setDate(today.getDate() - 30));
    } else if (period === 'custom') {
      return; // Await custom submit
    }

    this.startDate = this.formatDate(start);
    this.endDate = this.formatDate(new Date());
    this.loadData();
  }

  formatDate(date: Date): string {
    const d = new Date(date);
    let month = '' + (d.getMonth() + 1);
    let day = '' + d.getDate();
    const year = d.getFullYear();

    if (month.length < 2) month = '0' + month;
    if (day.length < 2) day = '0' + day;

    return [year, month, day].join('-');
  }

  loadData(): void {
    this.isLoading = true;
    this.errorMessage = null;

    // 1. Resumen Operativo
    this.statisticsService.getOperationalSummary().subscribe({
      next: (data) => {
        this.operationalSummary = data;
        this.updateEventStatusChart(data);
      },
      error: (err) => this.showError('Error al cargar el resumen operativo', err)
    });

    // 2. Ranking de Eventos
    this.statisticsService.getEventsRanking(this.rankingLimit).subscribe({
      next: (data) => {
        this.eventsRanking = data;
      },
      error: (err) => this.showError('Error al cargar ranking de eventos', err)
    });

    // 3. Resumen Financiero
    this.statisticsService.getFinancialSummary(this.startDate, this.endDate).subscribe({
      next: (data) => {
        this.financialSummary = data;
        this.updateFinancialChart(data);
      },
      error: (err) => this.showError('Error al cargar resumen financiero', err)
    });

    // 4. Series de tiempo de Publicidad
    const groupBy = this.selectedPeriod === 'today' || this.selectedPeriod === 'week' ? 'day' : 'month';
    this.statisticsService.getAdvertisingTimeSeries(groupBy).subscribe({
      next: (data) => {
        this.updateTimeSeriesChart(data);
      },
      error: (err) => this.showError('Error al cargar historial de ingresos', err)
    });

    // 5. Estadísticas del Token
    this.statisticsService.getTokenStats().subscribe({
      next: (data) => {
        this.tokenStats = data;
        this.updateTokenCharts(data);
      },
      error: (err) => this.showError('Error al cargar estadísticas del token VBK', err)
    });

    // 6. Alertas de seguridad / scalping
    this.statisticsService.getScalpingWarnings().subscribe({
      next: (data) => {
        this.scalpingWarnings = data;
        this.isLoading = false;
      },
      error: (err) => {
        this.showError('Error al cargar alertas de seguridad', err);
        this.isLoading = false;
      }
    });
  }

  // --- Chart Updates ---

  private updateEventStatusChart(data: OperationalSummaryDTO): void {
    const keys = Object.keys(data.eventsByStatus);
    const values = Object.values(data.eventsByStatus);

    this.eventStatusChartData = {
      labels: keys,
      datasets: [
        {
          data: values,
          backgroundColor: [
            'rgba(124, 58, 237, 0.75)', // Purple
            'rgba(249, 115, 22, 0.75)', // Orange
            'rgba(16, 185, 129, 0.75)', // Green
            'rgba(239, 68, 68, 0.75)'   // Red
          ],
          borderColor: [
            '#7c3aed',
            '#f97316',
            '#10b981',
            '#ef4444'
          ],
          borderWidth: 1
        }
      ]
    };
  }

  private updateFinancialChart(data: FinancialSummaryDTO): void {
    const labels = [
      'Publicidad (USDC)',
      'Publicidad (VBK)',
      'Consumiciones (Mock)',
      'Propinas Artistas (Mock)',
      'Fees Entradas (On-Chain)',
      'Fees Reventa (On-Chain)'
    ];

    const values = [
      data.advertisingUsdc,
      data.advertisingVbk * 0.10, // Convert to USD for standard scale (1 VBK = 0.10 USD)
      data.internalPaymentFees,
      data.artistTipFees,
      data.ticketFeesUsdc,
      data.resaleFees
    ];

    this.doughnutChartData = {
      labels: labels,
      datasets: [
        {
          data: values.map(v => Number(v)),
          backgroundColor: [
            '#22c55e', // Green
            '#a855f7', // Purple
            '#eab308', // Yellow
            '#06b6d4', // Cyan
            '#475569', // Dark Slate
            '#334155'  // Slate
          ],
          borderWidth: 0
        }
      ]
    };
  }

  private updateTimeSeriesChart(data: AdvertisingTimeSeriesDTO[]): void {
    const labels = data.map(d => d.period);
    const usdcValues = data.map(d => Number(d.revenueUsdc));
    const vbkValues = data.map(d => Number(d.revenueVbk));

    this.lineChartData = {
      labels: labels,
      datasets: [
        {
          data: usdcValues,
          label: 'Ingresos USDC',
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.15)',
          fill: true,
          tension: 0.4
        },
        {
          data: vbkValues,
          label: 'Ingresos VBK',
          borderColor: '#f97316',
          backgroundColor: 'rgba(249, 115, 22, 0.15)',
          fill: true,
          tension: 0.4
        }
      ]
    };
  }

  private updateTokenCharts(data: TokenStatsDTO): void {
    // Staking period chart
    const periods = Object.keys(data.stakingByPeriod);
    const stakingAmounts = Object.values(data.stakingByPeriod).map(v => Number(v));

    this.stakingChartData = {
      labels: periods,
      datasets: [
        {
          data: stakingAmounts,
          backgroundColor: ['#7c3aed', '#a855f7', '#d946ef'],
          borderWidth: 0
        }
      ]
    };

    // Supply projection chart (showing burn effects over next 6 months mock)
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'];
    let currentSupply = Number(data.circulatingSupply);
    const supplyTrend = months.map((m, i) => {
      if (i > 0) {
        currentSupply -= 250000; // Burn 250k each month mock
      }
      return currentSupply;
    });

    this.supplyChartData = {
      labels: months,
      datasets: [
        {
          data: supplyTrend,
          label: 'Supply Circulante VBK',
          borderColor: '#ef4444',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          fill: true,
          tension: 0.3
        }
      ]
    };
  }

  // Helper getters/converters
  get totalRevenueUsd(): number {
    if (!this.financialSummary) return 0;
    const adUsdc = Number(this.financialSummary.advertisingUsdc);
    const adVbkInUsd = Number(this.financialSummary.advertisingVbk) * 0.10; // 1 VBK = 0.10 USDC
    const internalMock = Number(this.financialSummary.internalPaymentFees);
    const tipMock = Number(this.financialSummary.artistTipFees);
    const ticketFees = Number(this.financialSummary.ticketFeesUsdc);
    const resaleFees = Number(this.financialSummary.resaleFees);
    return adUsdc + adVbkInUsd + internalMock + tipMock + ticketFees + resaleFees;
  }

  get totalAdvertisingUsd(): number {
    if (!this.financialSummary) return 0;
    return Number(this.financialSummary.advertisingUsdc) + (Number(this.financialSummary.advertisingVbk) * 0.10);
  }

  showError(message: string, error: any): void {
    console.error(message, error);
    this.errorMessage = `${message}. Verifique la conexión con el servidor.`;
  }

  goBack(): void {
    this.router.navigate(['/dashboard']);
  }
}
