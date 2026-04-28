import { CommonModule } from "@angular/common";
import { Component, inject, OnInit } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { MatTableDataSource, MatTableModule } from "@angular/material/table";
import { MatChipsModule } from "@angular/material/chips";
import { MatPaginatorModule } from "@angular/material/paginator";
import { Router, ActivatedRoute } from "@angular/router";

export interface TicketSummary {
  id: string;
  name: string;
  price: number;
  maxPrice: number;
  royalties: number;
  venueZone: string;
  status: 'DISPONIBLE' | 'AGOTADO';
}

@Component({
  selector: "app-admin-tickets",
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatIconModule,
    MatButtonModule,
    MatChipsModule,
    MatPaginatorModule,
    FormsModule
  ],
  templateUrl: "./admin-tickets.component.html",
  styleUrl: "./admin-tickets.component.scss",
})
export class AdminTicketsComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  eventId: string = "";
  dataSource = new MatTableDataSource<TicketSummary>([]);
  displayedColumns: string[] = ["id", "name", "price", "maxPrice", "royalties", "venueZone", "status", "actions"];

  ngOnInit(): void {
    this.eventId = this.route.snapshot.paramMap.get('id') || "";
    this.loadMockTickets();
  }

  loadMockTickets(): void {
    const mockTickets: TicketSummary[] = [
      { id: "TKT-001", name: "General Early Bird", price: 50, maxPrice: 75, royalties: 5, venueZone: "Campo", status: 'DISPONIBLE' },
      { id: "TKT-002", name: "VIP Experience", price: 150, maxPrice: 200, royalties: 10, venueZone: "VIP Box", status: 'DISPONIBLE' },
      { id: "TKT-003", name: "Platea Preferencial", price: 80, maxPrice: 120, royalties: 8, venueZone: "Platea A", status: 'AGOTADO' }
    ];
    this.dataSource.data = mockTickets;
  }

  goBack() {
    this.router.navigate(['/admin-events']);
  }
}
