import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable, BehaviorSubject } from "rxjs";
import { map, tap } from "rxjs/operators";
import { environment } from "../../environments/environment";
import { LoginRequest } from "../models/login-request.model";
import { RegisterRequest } from "../models/register-request.model";
import { AuthResponse } from "../models/auth-response.model";
import { User } from "../models/user.model";
import { jwtDecode } from "jwt-decode";

@Injectable({
  providedIn: "root",
})
export class AuthService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiBaseUrl;

  private currentUserSubject = new BehaviorSubject<{
    username: string;
    role: string;
  } | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  private accessTokenKey = "auth_access_token";
  private refreshTokenKey = "auth_refresh_token";

  constructor() {
    this.loadUserFromStorage();
  }

  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.apiUrl}/auth/login`, credentials)
      .pipe(
        tap((response) => {
          this.setTokens(response.accessToken, response.refreshToken);
          this.currentUserSubject.next({
            username: response.username,
            role: response.role,
          });
        }),
      );
  }

  register(data: RegisterRequest): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.apiUrl}/users/register`, data)
      .pipe(
        tap((response) => {
          this.setTokens(response.accessToken, response.refreshToken);
          this.currentUserSubject.next({
            username: response.username,
            role: response.role,
          });
        }),
      );
  }

  refreshToken(): Observable<AuthResponse> {
    const refreshToken = this.getRefreshToken();
    return this.http
      .post<AuthResponse>(`${this.apiUrl}/auth/refresh`, { refreshToken })
      .pipe(
        tap((response) => {
          this.setTokens(response.accessToken, response.refreshToken);
          this.currentUserSubject.next({
            username: response.username,
            role: response.role,
          });
        }),
      );
  }

  logout(): void {
    const refreshToken = this.getRefreshToken();
    if (refreshToken) {
      this.http.post(`${this.apiUrl}/auth/logout`, { refreshToken }).subscribe({
        next: () => {},
        error: (err) =>
          console.error("Error al hacer logout en el servidor:", err),
      });
    }
    this.clearLocalSession();
  }

  public clearLocalSession(): void {
    localStorage.removeItem(this.accessTokenKey);
    localStorage.removeItem(this.refreshTokenKey);
    this.currentUserSubject.next(null);
  }

  getToken(): string | null {
    return localStorage.getItem(this.accessTokenKey);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(this.refreshTokenKey);
  }

  public setTokens(accessToken: string, refreshToken: string): void {
    if (accessToken) localStorage.setItem(this.accessTokenKey, accessToken);
    if (refreshToken) localStorage.setItem(this.refreshTokenKey, refreshToken);
  }

  public loadUserFromToken(token: string): void {
    try {
      const decoded: any = jwtDecode(token);
      this.currentUserSubject.next({
        username: decoded.sub || decoded.username || "Usuario",
        role: decoded.role || "comprar",
      });
    } catch (e) {
      this.logout();
    }
  }

  private loadUserFromStorage(): void {
    const token = this.getToken();
    if (token) {
      try {
        const decoded: any = jwtDecode(token);
        this.currentUserSubject.next({
          username: decoded.sub || decoded.username || "Usuario",
          role: decoded.role || "comprar",
        });
      } catch (e) {
        this.logout();
      }
    }
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  getCurrentUserValue(): { username: string; role: string } | null {
    return this.currentUserSubject.value;
  }
}
