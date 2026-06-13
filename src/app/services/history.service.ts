import { Injectable, inject } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { Observable } from "rxjs";
import { environment } from "../../environments/environment";
import { Page } from "../models/page.model";
import { UserHistoryItem } from "../models/user-history.model";

@Injectable({ providedIn: "root" })
export class HistoryService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiBaseUrl}/history`;

  getMyHistory(
    page: number = 0,
    size: number = 10,
    sort: string | string[] = "attendedAt,desc",
  ): Observable<Page<UserHistoryItem>> {
    let params = new HttpParams()
      .set("page", page)
      .set("size", size);

    const sortValues = Array.isArray(sort) ? sort : [sort];
    sortValues
      .filter(Boolean)
      .forEach((sortValue) => {
        params = params.append("sort", sortValue);
      });

    return this.http.get<Page<UserHistoryItem>>(`${this.apiUrl}/me`, { params });
  }

  getUserHistory(
    username: string,
    page: number = 0,
    size: number = 10,
    sort: string | string[] = "attendedAt,desc",
  ): Observable<Page<UserHistoryItem>> {
    let params = new HttpParams()
      .set("page", page)
      .set("size", size);

    const sortValues = Array.isArray(sort) ? sort : [sort];
    sortValues
      .filter(Boolean)
      .forEach((sortValue) => {
        params = params.append("sort", sortValue);
      });

    return this.http.get<Page<UserHistoryItem>>(`${this.apiUrl}/user/${username}`, { params });
  }
}
