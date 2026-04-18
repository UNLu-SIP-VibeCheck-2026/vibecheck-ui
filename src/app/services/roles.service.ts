import { HttpClient } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { environment } from "../../environments/environment";
import { Observable } from "rxjs";
import { Page } from "../models/page.model";
import { RoleResponse } from "../models/role-response.model";
import { RoleCreateRequest, RoleUpdateRequest } from "../models/role-requests.model";

@Injectable({
  providedIn: "root",
})
export class RolesService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiBaseUrl;

  getRoles(page: number, size: number): Observable<Page<RoleResponse>> {
    const params = { page: page.toString(), size: size.toString() };
    return this.http.get<Page<RoleResponse>>(`${this.apiUrl}/roles`, { params });
  }

  createRole(data: RoleCreateRequest): Observable<RoleResponse> {
    return this.http.post<RoleResponse>(`${this.apiUrl}/roles`, data);
  }

  updateRole(id: number, data: RoleUpdateRequest): Observable<RoleResponse> {
    return this.http.put<RoleResponse>(`${this.apiUrl}/roles/${id}`, data);
  }

  deleteRole(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/roles/${id}`);
  }
}
