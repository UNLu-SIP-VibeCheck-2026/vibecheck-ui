import { CommonModule } from "@angular/common";
import { Component, inject, OnInit } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { MatTableDataSource, MatTableModule } from "@angular/material/table";
import { MatChipsModule } from "@angular/material/chips";
import { MatPaginatorModule } from "@angular/material/paginator";
import { MatDialog, MatDialogModule } from "@angular/material/dialog";
import { Router, ActivatedRoute } from "@angular/router";
import { TicketDialogComponent } from "../shared/dialogs/ticket-dialog/ticket-dialog.component";
import { ResaleDialogComponent } from "../shared/dialogs/resale-dialog/resale-dialog.component";
import { ConfirmDialogComponent } from "../shared/dialogs/confirm-dialog/confirm-dialog.component";

export interface TicketSummary {
  id: string;
  name: string;
  price: number;
  maxPrice: number;
  royalties: number;
  venueZone: string;
  totalQuantity: number;
  soldQuantity: number;
  remainingQuantity: number;
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
    MatDialogModule,
    FormsModule
  ],
  templateUrl: "./admin-tickets.component.html",
  styleUrl: "./admin-tickets.component.scss",
})
export class AdminTicketsComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private dialog = inject(MatDialog);

  eventId: string = "";
  dataSource = new MatTableDataSource<TicketSummary>([]);
  displayedColumns: string[] = [
    "id", 
    "name", 
    "price",
    "maxPrice",
    "royalties",
    "totalQuantity", 
    "soldQuantity", 
    "remainingQuantity", 
    "venueZone", 
    "status", 
    "actions"
  ];

  ngOnInit(): void {
    this.eventId = this.route.snapshot.paramMap.get('id') || "";
    this.loadMockTickets();
  }

  loadMockTickets(): void {
    const mockTickets: TicketSummary[] = [
      { 
        id: "TKT-001", 
        name: "General Early Bird", 
        price: 50, 
        maxPrice: 75, 
        royalties: 5, 
        venueZone: "Campo", 
        totalQuantity: 1000, 
        soldQuantity: 450, 
        remainingQuantity: 550, 
        status: 'DISPONIBLE' 
      },
      { 
        id: "TKT-002", 
        name: "VIP Experience", 
        price: 150, 
        maxPrice: 200, 
        royalties: 10, 
        venueZone: "VIP Box", 
        totalQuantity: 200, 
        soldQuantity: 180, 
        remainingQuantity: 20, 
        status: 'DISPONIBLE' 
      },
      { 
        id: "TKT-003", 
        name: "Platea Preferencial", 
        price: 80, 
        maxPrice: 120, 
        royalties: 8, 
        venueZone: "Platea A", 
        totalQuantity: 500, 
        soldQuantity: 500, 
        remainingQuantity: 0, 
        status: 'AGOTADO' 
      }
    ];
    this.dataSource.data = mockTickets;
  }

  goBack() {
    this.router.navigate(['/admin-events']);
  }

  private updateStatus(ticket: Partial<TicketSummary>): 'DISPONIBLE' | 'AGOTADO' {
    if (ticket.totalQuantity !== undefined && ticket.soldQuantity !== undefined) {
      return (ticket.totalQuantity - ticket.soldQuantity) <= 0 ? 'AGOTADO' : 'DISPONIBLE';
    }
    return 'DISPONIBLE';
  }

  addTicket() {
    const dialogRef = this.dialog.open(TicketDialogComponent, {
      width: "550px",
      data: {},
      autoFocus: false,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        const totalQuantity = result.totalQuantity || 0;
        const soldQuantity = 0; // Default for new tickets
        const remainingQuantity = totalQuantity;
        
        const newTicket: TicketSummary = {
          id: `TKT-00${this.dataSource.data.length + 1}`,
          ...result,
          soldQuantity,
          remainingQuantity,
          status: this.updateStatus({ totalQuantity, soldQuantity })
        };
        this.dataSource.data = [...this.dataSource.data, newTicket];
      }
    });
  }

  editTicket(ticket: TicketSummary) {
    const dialogRef = this.dialog.open(TicketDialogComponent, {
      width: "550px",
      data: { ticket },
      autoFocus: false,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        const index = this.dataSource.data.findIndex(t => t.id === ticket.id);
        if (index !== -1) {
          const updatedData = [...this.dataSource.data];
          const totalQuantity = result.totalQuantity;
          const soldQuantity = ticket.soldQuantity; // Keep current sales
          const remainingQuantity = Math.max(0, totalQuantity - soldQuantity);
          
          updatedData[index] = { 
            ...ticket, 
            ...result, 
            remainingQuantity,
            status: this.updateStatus({ totalQuantity, soldQuantity })
          };
          this.dataSource.data = updatedData;
        }
      }
    });
  }

  deleteTicket(ticket: TicketSummary) {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: "Eliminar Ticket",
        message: `¿Estás seguro que deseas eliminar el ticket "${ticket.name}"?`,
        confirmText: "Eliminar",
        cancelText: "Cancelar"
      }
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.dataSource.data = this.dataSource.data.filter(t => t.id !== ticket.id);
      }
    });
  }

  openResaleConfig(ticket: TicketSummary) {
    const dialogRef = this.dialog.open(ResaleDialogComponent, {
      width: "440px",
      data: { 
        event: { 
          title: ticket.name, 
          maxResalePrice: ticket.maxPrice 
        } 
      },
      autoFocus: false,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        const index = this.dataSource.data.findIndex(t => t.id === ticket.id);
        if (index !== -1) {
          const updatedData = [...this.dataSource.data];
          updatedData[index].maxPrice = result.maxResalePrice;
          this.dataSource.data = updatedData;
        }
      }
    });
  }
}
