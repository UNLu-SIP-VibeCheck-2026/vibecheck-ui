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
import { AuditLogsService } from "../../services/audit-logs.service";
import { AuditLogResponse } from "../../models/audit-log-response.model";
import { LogDetailDialogComponent } from '../shared/dialogs/log-detail-dialog/log-detail-dialog.component';

@Component({
  selector: "app-system-logs",
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
  ],
  templateUrl: "./system-logs.component.html",
  styleUrl: "./system-logs.component.scss",
})
export class SystemLogsComponent implements OnInit {
  private dialog = inject(MatDialog);
  private auditLogsService = inject(AuditLogsService);

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  displayedColumns: string[] = [
    "id",
    "fecha",
    "usuarioDb",
    "tabla",
    "operacion",
    "actions",
  ];
  dataSource = new MatTableDataSource<AuditLogResponse>([]);
  
  sortBy: string = "id";
  sortDirection: string = "desc";

  totalElements = 0;
  pageSize = 10;
  pageIndex = 0;

  ngOnInit(): void {
    this.loadLogs();
  }

  loadLogs(): void {
    this.auditLogsService.getAuditLogs(this.pageIndex, this.pageSize, this.sortBy, this.sortDirection).subscribe({
      next: (page) => {
        this.dataSource.data = page.content;
        this.totalElements = page.totalElements;
      },
      error: (err) => console.error("Error cargando logs:", err)
    });
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadLogs();
  }

  onSortChange(sortState: Sort) {
    this.sortBy = sortState.active;
    this.sortDirection = sortState.direction || 'asc';
    this.pageIndex = 0;
    this.loadLogs();
  }

  viewDetail(log: AuditLogResponse) {
    this.dialog.open(LogDetailDialogComponent, {
      width: "800px",
      data: { log },
      autoFocus: false,
    });
  }
}
