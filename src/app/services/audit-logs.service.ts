import { HttpClient } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { environment } from "../../environments/environment";
import { Observable } from "rxjs";
import { Page } from "../models/page.model";
import { AuditLogResponse } from "../models/audit-log-response.model";

@Injectable({
  providedIn: "root",
})
export class AuditLogsService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiBaseUrl;

  constructor() {}

  getAuditLogs(page: number, size: number, sortBy?: string, sortDirection?: string): Observable<Page<AuditLogResponse>> {
    let params: any = { 
      page: page.toString(), 
      size: size.toString() 
    };
    
    if (sortBy) {
      const direction = sortDirection || 'asc';
      params.sort = `${sortBy},${direction}`;
    }

    return this.http.get<Page<AuditLogResponse>>(`${this.apiUrl}/audit-logs`, { params });
  }
}
