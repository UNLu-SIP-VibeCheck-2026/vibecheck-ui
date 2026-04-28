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

export interface EventSummary {
  id: string;
  title: string;
  description: string;
  creationDate: string;
  celebrationDate: string;
  venue: string;
  active: boolean;
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
        description: "Excepteur efficient emerging, minim veniam anim aute carefully curated Ginza conversation exquisite perfect nostrud nisi intricate Content. Qui international first-class nulla ut. Punctual adipisicing, essential lovely queen",
        creationDate: "28/04/2026",
        celebrationDate: "15/05/2026",
        venue: "VENUE01",
        active: true,
        selected: false
      },
      {
        id: "EVENTO002",
        title: "EVENTO002",
        description: "Excepteur efficient emerging, minim veniam anim aute carefully curated Ginza conversation exquisite perfect nostrud nisi intricate Content. Qui international first-class nulla ut.",
        creationDate: "28/04/2026",
        celebrationDate: "20/05/2026",
        venue: "VENUE02",
        active: true,
        selected: false
      },
      {
        id: "EVENTO003",
        title: "EVENTO003",
        description: "Excepteur efficient emerging, minim veniam anim aute carefully curated Ginza conversation exquisite perfect nostrud nisi intricate Content. Qui international first-class nulla ut.",
        creationDate: "28/04/2026",
        celebrationDate: "25/05/2026",
        venue: "VENUE03",
        active: false,
        selected: false
      },
      {
        id: "EVENTO004",
        title: "EVENTO004",
        description: "Excepteur efficient emerging, minim veniam anim aute carefully curated Ginza conversation exquisite perfect nostrud nisi intricate Content. Qui international first-class nulla ut.",
        creationDate: "28/04/2026",
        celebrationDate: "30/05/2026",
        venue: "VENUE04",
        active: true,
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

  editEvent(event: EventSummary) {
    console.log("Editing event:", event.id);
  }

  viewStats(event: EventSummary) {
    console.log("Viewing stats for:", event.id);
  }

  openSettings(event: EventSummary) {
    console.log("Opening settings for:", event.id);
  }

  viewFinance(event: EventSummary) {
    console.log("Viewing finance for:", event.id);
  }

  removeFilter(filter: string) {
    this.appliedFilters = this.appliedFilters.filter(f => f !== filter);
  }
}
