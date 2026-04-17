import { HttpClient } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { environment } from "../../environments/environment";

@Injectable({
  providedIn: "root",
})
export class RolesService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiBaseUrl;

  constructor() {}
}
