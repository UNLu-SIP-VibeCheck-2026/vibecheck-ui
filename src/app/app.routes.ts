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
import { WalletComponent } from "./components/wallet/wallet.component";
import { EventsComponent } from "./components/events/events.component";
import { CreateEventComponent } from "./components/create-event/create-event.component";
import { AdminEventsComponent } from "./components/admin-events/admin-events.component";
import { AdminVenuesComponent } from "./components/admin-venues/admin-venues.component";
import { AdminTicketsComponent } from "./components/admin-tickets/admin-tickets.component";
import { AdvertiseEventComponent } from "./components/advertise-event/advertise-event.component";
import { EventComponent } from "./components/event/event.component";
import { SelectTicketsComponent } from "./components/select-tickets/select-tickets.component";
import { MyTicketsComponent } from "./components/my-tickets/my-tickets.component";
import { TicketComponent } from "./components/ticket/ticket.component";
import { TicketMarketplaceComponent } from "./components/ticket-marketplace/ticket-marketplace.component";
import { MarketplaceCheckoutComponent } from "./components/marketplace-checkout/marketplace-checkout.component";
import { GiftTicketComponent } from "./components/gift-ticket/gift-ticket.component";
import { ResellTicketComponent } from "./components/resell-ticket/resell-ticket.component";
import { authGuard } from "./guards/auth.guard";
import { guestGuard } from "./guards/guest.guard";
import { ResetPasswordComponent } from "./components/reset-password/reset-password.component";

export const routes: Routes = [
  {
    path: "",
    component: HomeComponent,
    pathMatch: "full",
    canActivate: [guestGuard],
  },
  {
    path: "pass-recovery",
    component: PasswordRecoveryComponent,
    canActivate: [guestGuard],
  },
  {
    path: "reset-password",
    component: ResetPasswordComponent,
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
  {
    path: "wallet",
    component: WalletComponent,
    canActivate: [authGuard],
  },
  {
    path: "events",
    component: EventsComponent,
    canActivate: [authGuard],
  },
  {
    path: "create-event",
    component: CreateEventComponent,
    canActivate: [authGuard],
  },
  {
    path: "admin-events",
    component: AdminEventsComponent,
    canActivate: [authGuard],
  },
  {
    path: "admin-venues",
    component: AdminVenuesComponent,
    canActivate: [authGuard],
  },
  {
    path: "event/:id",
    component: EventComponent,
    canActivate: [authGuard],
  },
  {
    path: "select-tickets/:id",
    component: SelectTicketsComponent,
    canActivate: [authGuard],
  },
  {
    path: "my-tickets",
    component: MyTicketsComponent,
    canActivate: [authGuard],
  },
  {
    path: "ticket/:id",
    component: TicketComponent,
    canActivate: [authGuard],
  },
  {
    path: "ticket-marketplace/:id",
    component: TicketMarketplaceComponent,
    canActivate: [authGuard],
  },
  {
    path: "marketplace-checkout/:id",
    component: MarketplaceCheckoutComponent,
    canActivate: [authGuard],
  },
  {
    path: "gift-ticket/:id",
    component: GiftTicketComponent,
    canActivate: [authGuard],
  },
  {
    path: "resell-ticket/:id",
    component: ResellTicketComponent,
    canActivate: [authGuard],
  },
  {
    path: "admin-tickets/:id",
    component: AdminTicketsComponent,
    canActivate: [authGuard],
  },
  {
    path: "advertise-event/:id",
    component: AdvertiseEventComponent,
    canActivate: [authGuard],
  },
  { path: "**", redirectTo: "" },
];
