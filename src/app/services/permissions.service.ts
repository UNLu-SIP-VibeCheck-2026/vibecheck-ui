import { HttpClient } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { environment } from "../../environments/environment";
import { Observable } from "rxjs";
import { Page } from "../models/page.model";
import { PermissionResponse } from "../models/permission-response.model";

@Injectable({
  providedIn: "root",
})
export class PermissionsService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiBaseUrl;

  getPermissions(page: number, size: number): Observable<Page<PermissionResponse>> {
    const params = { page: page.toString(), size: size.toString() };
    return this.http.get<Page<PermissionResponse>>(`${this.apiUrl}/permissions`, { params });
  }
}
