import { HttpClient } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { environment } from "../../environments/environment";
import { Observable } from "rxjs";
import { Page } from "../models/page.model";
import { UserSummaryResponse } from "../models/user-summary-response.model";

import { UserUpdateRequest } from "../models/user-update-request.model";

@Injectable({
  providedIn: "root",
})
export class UsersService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiBaseUrl;

  constructor() {}

  getUsers(page: number, size: number, search?: string, role?: string, active?: boolean | string, sortBy?: string, sortDirection?: string): Observable<Page<UserSummaryResponse>> {
    let params: any = { page: page.toString(), size: size.toString() };
    if (search) params.search = search;
    if (role) params.role = role;
    if (active !== undefined && active !== null && active !== '') params.active = active.toString();
    if (sortBy) params.sortBy = sortBy;
    if (sortDirection) params.sortDirection = sortDirection;
    return this.http.get<Page<UserSummaryResponse>>(`${this.apiUrl}/users/list-paginated`, { params });
  }

  updateUser(originalUsername: string, data: UserUpdateRequest): Observable<any> {
    return this.http.put(`${this.apiUrl}/users/${originalUsername}`, data);
  }

  deactivateUser(username: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/users/${username}`);
  }

  changePassword(username: string, payload: any): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/users/${username}/changePassword`, payload);
  }
}
