import { HttpClient } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { environment } from "../../environments/environment";
import { Observable } from "rxjs";
import { Page } from "../models/page.model";
import { UserSummaryResponse } from "../models/user-summary-response.model";
import { UserUpdateRequest } from "../models/user-update-request.model";
import { UserPublicResponse } from "../models/user-public-response.model";

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

  getUserByUsername(username: string): Observable<UserSummaryResponse> {
    return this.http.get<UserSummaryResponse>(`${this.apiUrl}/users/${username}`);
  }

  getPublicUser(username: string): Observable<UserPublicResponse> {
    return this.http.get<UserPublicResponse>(`${this.apiUrl}/users/public/${username}`);
  }

  getPublicUserById(id: number): Observable<UserPublicResponse> {
    return this.http.get<UserPublicResponse>(`${this.apiUrl}/users/public/id/${id}`);
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

  verifyEmail(token: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/users/verify`, { params: { token } });
  }

  resendVerification(email: string): Observable<string> {
    return this.http.post(`${this.apiUrl}/users/resend-verification`, null, {
      params: { email },
      responseType: 'text'
    });
  }

  forgotPassword(email: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/users/forgot-password`, null, {
      params: { email }
    });
  }

  resetPassword(payload: { token: string; newPassword: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/users/reset-password`, payload, { responseType: 'text' });
  }

  getUserImage(username: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/users/${username}/image`, { responseType: 'blob' });
  }

  getPublicUserImage(username: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/users/public/${username}/image`, { responseType: 'blob' });
  }

  uploadUserImage(username: string, image: File): Observable<any> {
    const formData = new FormData();
    formData.append('image', image);
    return this.http.post(`${this.apiUrl}/users/${username}/image`, formData);
  }
}

