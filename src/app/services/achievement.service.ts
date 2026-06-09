import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { environment } from "../../environments/environment";
import { Achievement } from "../models/achievement.model";

@Injectable({
  providedIn: "root",
})
export class AchievementService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiBaseUrl}/achievements`;

  getMyAchievements(): Observable<Achievement[]> {
    return this.http.get<Achievement[]>(`${this.apiUrl}/me`);
  }
}
