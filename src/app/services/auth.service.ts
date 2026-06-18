import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable, BehaviorSubject, throwError, of } from "rxjs";
import { map, tap, shareReplay, finalize, switchMap } from "rxjs/operators";
import { environment } from "../../environments/environment";
import { UsersService } from "./users.service";
import { RolesService } from "./roles.service";
import { UserUpdateRequest } from "../models/user-update-request.model";
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
  private usersService = inject(UsersService);
  private rolesService = inject(RolesService);

  private currentUserSubject = new BehaviorSubject<{
    username: string;
    role: string;
  } | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  private accessTokenKey = "auth_access_token";
  private refreshTokenKey = "auth_refresh_token";
  private refreshTokenObservable: Observable<AuthResponse> | null = null;

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

  register(data: RegisterRequest): Observable<string> {
    return this.http.post(`${this.apiUrl}/users/register`, data, { responseType: 'text' });
  }

  refreshToken(): Observable<AuthResponse> {
    if (this.refreshTokenObservable) {
      return this.refreshTokenObservable;
    }

    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      return throwError(() => new Error("No hay token de refresco disponible"));
    }

    this.refreshTokenObservable = this.http
      .post<AuthResponse>(`${this.apiUrl}/auth/refresh`, { refreshToken })
      .pipe(
        tap((response) => {
          this.setTokens(response.accessToken, response.refreshToken);
          this.currentUserSubject.next({
            username: response.username,
            role: response.role,
          });
        }),
        shareReplay(1),
        finalize(() => {
          this.refreshTokenObservable = null;
        })
      );

    return this.refreshTokenObservable;
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

  switchUserRole(targetRoleName: "cliente" | "organizador"): Observable<void> {
    const currentUser = this.getCurrentUserValue();
    if (!currentUser) {
      return throwError(() => new Error("Usuario no autenticado"));
    }

    return this.usersService.getUserByUsername(currentUser.username).pipe(
      switchMap((fullUser) => {
        return this.rolesService.getFinalRoles().pipe(
          switchMap((roles) => {
            const targetNames = targetRoleName === "cliente"
              ? ["cliente", "Cliente", "CLIENTE"]
              : ["organizador", "Organizador", "ORGANIZADOR"];
            const fallbackId = targetRoleName === "cliente" ? 5 : 6;

            const matchingRole = roles.find((r) =>
              targetNames.some((name) => r.name.toUpperCase().includes(name.toUpperCase()))
            );
            const finalRoleId = matchingRole ? matchingRole.id : fallbackId;

            let formattedBirthdate = fullUser.birthdate;
            if (Array.isArray(fullUser.birthdate)) {
              const [year, month, day] = fullUser.birthdate;
              formattedBirthdate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            }

            const updatePayload: UserUpdateRequest = {
              username: fullUser.username,
              name: fullUser.name,
              lastName: fullUser.lastName,
              email: fullUser.email,
              phoneNumber: fullUser.phoneNumber,
              birthdate: formattedBirthdate,
              roleId: finalRoleId
            };

            return this.usersService.updateUser(currentUser.username, updatePayload);
          })
        );
      }),
      switchMap(() => this.refreshToken()),
      map(() => void 0)
    );
  }
}
