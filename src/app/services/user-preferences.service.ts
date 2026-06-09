import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { environment } from "../../environments/environment";
import { UserPreferences } from "../models/user-preferences.model";

@Injectable({
  providedIn: "root",
})
export class UserPreferencesService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiBaseUrl}/preferences`;

  getPreferences(): Observable<UserPreferences> {
    return this.http.get<UserPreferences>(`${this.apiUrl}/me`);
  }

  updatePreferences(prefs: Partial<UserPreferences>): Observable<UserPreferences> {
    return this.http.put<UserPreferences>(`${this.apiUrl}/me`, prefs);
  }
}
