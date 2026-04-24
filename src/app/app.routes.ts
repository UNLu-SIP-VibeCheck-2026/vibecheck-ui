import { Routes } from "@angular/router";
import { LoginComponent } from "./components/login/login.component";
import { RegisterComponent } from "./components/register/register.component";
import { HomeComponent } from "./components/home/home.component";
import { ChangePasswordComponent } from "./components/change-password/change-password.component";
import { PasswordRecoveryComponent } from "./components/password-recovery/password-recovery.component";
import { PerfilConfigComponent } from "./components/perfil-config/perfil-config.component";
import { PerfilUserComponent } from "./components/perfil-user/perfil-user.component";
import { AdminPermissionsComponent } from "./components/admin-permissions/admin-permissions.component";
import { AdminRolesComponent } from "./components/admin-roles/admin-roles.component";
import { AdminUsersComponent } from "./components/admin-users/admin-users.component";
import { DashboardComponent } from "./components/dashboard/dashboard.component";
import { OAuthCallbackComponent } from "./components/oauth-callback/oauth-callback.component";
import { SystemLogsComponent } from "./components/system-logs/system-logs.component";
import { EmailVerifyComponent } from "./components/email-verify/email-verify.component";
import { authGuard } from "./guards/auth.guard";
import { guestGuard } from "./guards/guest.guard";

export const routes: Routes = [
  { path: "", component: HomeComponent, pathMatch: "full" },
  {
    path: "pass-recovery",
    component: PasswordRecoveryComponent,
    canActivate: [guestGuard],
  },
  {
    path: "change-password",
    component: ChangePasswordComponent,
    canActivate: [authGuard],
  },
  {
    path: "perfil-config",
    component: PerfilConfigComponent,
    canActivate: [authGuard],
  },
  {
    path: "perfil-user/:username",
    component: PerfilUserComponent,
    canActivate: [authGuard],
  },
  {
    path: "admin-permissions",
    component: AdminPermissionsComponent,
    canActivate: [authGuard],
  },
  {
    path: "admin-roles",
    component: AdminRolesComponent,
    canActivate: [authGuard],
  },
  {
    path: "admin-users",
    component: AdminUsersComponent,
    canActivate: [authGuard],
  },
  { path: "login", component: LoginComponent, canActivate: [guestGuard] },
  { path: "register", component: RegisterComponent, canActivate: [guestGuard] },
  {
    path: "auth/oauth2/callback",
    component: OAuthCallbackComponent,
  },
  {
    path: "dashboard",
    component: DashboardComponent,
    canActivate: [authGuard],
  },
  {
    path: "system-logs",
    component: SystemLogsComponent,
    canActivate: [authGuard],
  },
  {
    path: "verify-email",
    component: EmailVerifyComponent,
  },
  { path: "**", redirectTo: "" },
];
