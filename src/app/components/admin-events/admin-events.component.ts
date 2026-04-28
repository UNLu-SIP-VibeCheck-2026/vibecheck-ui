import { CommonModule } from "@angular/common";
import { Component, inject, OnInit, ViewChild } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { MatButtonModule } from "@angular/material/button";
import { MatChipsModule } from "@angular/material/chips";
import { MatDialog, MatDialogModule } from "@angular/material/dialog";
import { MatIconModule } from "@angular/material/icon";
import { MatInputModule } from "@angular/material/input";
import { MatPaginator, MatPaginatorModule, PageEvent } from "@angular/material/paginator";
import { MatSortModule, Sort } from "@angular/material/sort";
import { MatTableDataSource, MatTableModule } from "@angular/material/table";
import { MatSelectModule } from "@angular/material/select";
import { MatCheckboxModule } from "@angular/material/checkbox";
import { Router } from "@angular/router";
import { EventDialogComponent } from "../shared/dialogs/event-dialog/event-dialog.component";
import { ResaleDialogComponent } from "../shared/dialogs/resale-dialog/resale-dialog.component";

export interface EventSummary {
  id: string;
  title: string;
  description: string;
  creationDate: string;
  startDate: string;
  endDate: string;
  venue: string;
  status: 'PROGRAMADO' | 'EN_CURSO' | 'FINALIZADO' | 'CANCELADO';
  imageUrl?: string;
  selected?: boolean;
}

@Component({
  selector: "app-admin-events",
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatIconModule,
    MatInputModule,
    MatButtonModule,
    MatChipsModule,
    MatSelectModule,
    FormsModule,
    MatDialogModule,
    MatPaginatorModule,
    MatSortModule,
    MatCheckboxModule,
  ],
  templateUrl: "./admin-events.component.html",
  styleUrl: "./admin-events.component.scss",
})
export class AdminEventsComponent implements OnInit {
  private router = inject(Router);
  private dialog = inject(MatDialog);

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  displayedColumns: string[] = ["event"]; // We use a single column to host the custom card layout
  dataSource = new MatTableDataSource<EventSummary>([]);
  searchQuery: string = "";
  
  appliedFilters: string[] = ["Filtro 1", "Filtro 2", "Filtro 3"];

  totalElements = 4;
  pageSize = 5;
  pageIndex = 0;

  isAllSelected(): boolean {
    return this.dataSource.data.length > 0 && this.dataSource.data.every(e => e.selected);
  }

  isAtLeastOneSelected(): boolean {
    return this.dataSource.data.some(e => e.selected);
  }

  toggleAllSelection(checked: boolean) {
    this.dataSource.data.forEach(e => e.selected = checked);
  }

  ngOnInit(): void {
    this.loadMockEvents();
  }

  loadMockEvents(): void {
    const mockEvents: EventSummary[] = [
      {
        id: "EVENTO001",
        title: "EVENTO001",
        description: "Excepteur efficient emerging, minim veniam anim aute carefully curated Ginza conversation exquisite perfect nostrud nisi intricate Content.",
        creationDate: "28/04/2026",
        startDate: "15/05/2026 21:00",
        endDate: "16/05/2026 03:00",
        venue: "VENUE01",
        status: 'PROGRAMADO',
        selected: false
      },
      {
        id: "EVENTO002",
        title: "VibeFest 2026",
        description: "El festival más esperado del año con artistas internacionales.",
        creationDate: "25/04/2026",
        startDate: "20/05/2026 18:00",
        endDate: "21/05/2026 04:00",
        venue: "VENUE02",
        status: 'EN_CURSO',
        selected: false
      },
      {
        id: "EVENTO003",
        title: "Sunset Party",
        description: "Música electrónica frente al río.",
        creationDate: "20/04/2026",
        startDate: "10/05/2026 17:00",
        endDate: "10/05/2026 23:59",
        venue: "VENUE03",
        status: 'FINALIZADO',
        selected: false
      }
    ];
    this.dataSource.data = mockEvents;
    this.totalElements = mockEvents.length;
  }

  goBack() {
    this.router.navigate(['/dashboard']);
  }

  applyFilter(): void {
    // Mock filter logic
    console.log("Filtering by:", this.searchQuery);
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
  }

  createEvent() {
    this.router.navigate(['/create-event']);
  }

  navigateToEvent(id: string) {
    this.router.navigate(['/event', id]);
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'PROGRAMADO': return 'scheduled-chip';
      case 'EN_CURSO': return 'inprogress-chip';
      case 'FINALIZADO': return 'finished-chip';
      case 'CANCELADO': return 'cancelled-chip';
      default: return '';
    }
  }

  editEvent(event: EventSummary) {
    const dialogRef = this.dialog.open(EventDialogComponent, {
      width: "600px",
      data: { event },
      autoFocus: false,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        console.log("Updating event:", event.id, result);
        // Here we would call a service to update
        Object.assign(event, result);
      }
    });
  }

  viewStats(event: EventSummary) {
    this.router.navigate(['/admin-tickets', event.id]);
  }

  openSettings(event: EventSummary) {
    const dialogRef = this.dialog.open(ResaleDialogComponent, {
      width: "440px",
      data: { event },
      autoFocus: false,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        console.log("Resale price updated:", result);
        // service call
      }
    });
  }

  viewFinance(event: EventSummary) {
    this.router.navigate(['/advertise-event', event.id]);
  }

  removeFilter(filter: string) {
    this.appliedFilters = this.appliedFilters.filter(f => f !== filter);
  }
}
