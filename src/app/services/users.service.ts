import { HttpClient } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { environment } from "../../environments/environment";
import { Observable } from "rxjs";
import { Page } from "../models/page.model";
import { UserSummaryResponse } from "../models/user-summary-response.model";

@Injectable({
  providedIn: "root",
})
export class UsersService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiBaseUrl;

  constructor() {}

  getUsers(page: number, size: number): Observable<Page<UserSummaryResponse>> {
    return this.http.get<Page<UserSummaryResponse>>(`${this.apiUrl}/users/list-paginated`, { 
      params: { page: page.toString(), size: size.toString() } 
    });
  }
}
