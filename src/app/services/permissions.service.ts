import { HttpClient } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { environment } from "../../environments/environment";
import { Observable } from "rxjs";
import { Page } from "../models/page.model";
import { PermissionResponse } from "../models/permission-response.model";

export interface PermissionCreateRequest {
  name: string;
  description: string;
}

@Injectable({
  providedIn: "root",
})
export class PermissionsService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiBaseUrl;

  getPermissions(page: number, size: number, search: string = ''): Observable<Page<PermissionResponse>> {
    const params: any = { page: page.toString(), size: size.toString() };
    if (search) params['search'] = search;
    return this.http.get<Page<PermissionResponse>>(`${this.apiUrl}/permissions`, { params });
  }

  createPermission(data: PermissionCreateRequest): Observable<PermissionResponse> {
    return this.http.post<PermissionResponse>(`${this.apiUrl}/permissions`, data);
  }

  updatePermission(id: number, data: PermissionCreateRequest): Observable<PermissionResponse> {
    return this.http.put<PermissionResponse>(`${this.apiUrl}/permissions/${id}`, data);
  }

  deletePermission(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/permissions/${id}`);
  }
}
