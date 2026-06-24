import { Routes } from "@angular/router";
import { LoginComponent } from "./components/login/login.component";
import { RegisterComponent } from "./components/register/register.component";
import { ChangePasswordComponent } from "./components/change-password/change-password.component";
import { PasswordRecoveryComponent } from "./components/password-recovery/password-recovery.component";
import { PerfilConfigComponent } from "./components/perfil-config/perfil-config.component";
import { PerfilUserComponent } from "./components/perfil-user/perfil-user.component";
import { PerfilUserHistoryComponent } from "./components/perfil-user-history/perfil-user-history.component";
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
import { TicketPurchaseComponent } from "./components/select-tickets/select-tickets.component";
import { MyTicketsComponent } from "./components/my-tickets/my-tickets.component";
import { TicketComponent } from "./components/ticket/ticket.component";
import { TicketMarketplaceComponent } from "./components/ticket-marketplace/ticket-marketplace.component";
import { MarketplaceCheckoutComponent } from "./components/marketplace-checkout/marketplace-checkout.component";
import { GiftTicketComponent } from "./components/gift-ticket/gift-ticket.component";
import { ResellTicketComponent } from "./components/resell-ticket/resell-ticket.component";
import { authGuard } from "./guards/auth.guard";
import { guestGuard } from "./guards/guest.guard";
import { roleGuard } from "./guards/role.guard";
import { ResetPasswordComponent } from "./components/reset-password/reset-password.component";
import { NotFoundComponent } from "./components/not-found/not-found.component";
import { SwapComponent } from "./components/swap/swap.component";
import { MyListingsComponent } from "./components/my-listings/my-listings.component";
import { MarketplaceListComponent } from "./components/marketplace-list/marketplace-list.component";
import { MarketplaceDetailComponent } from "./components/marketplace-detail/marketplace-detail.component";
import { ValidatorManagementComponent } from "./components/validator-management/validator-management.component";
import { AchievementsComponent } from "./components/achievements/achievements.component";
import { QrScannerComponent } from "./components/qr-scanner/qr-scanner.component";


export const routes: Routes = [
  {
    path: "",
    component: EventsComponent,
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
    path: "perfil-user/:username/historial",
    component: PerfilUserHistoryComponent,
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
    path: "achievements",
    component: AchievementsComponent,
    canActivate: [authGuard],
  },
  {
    path: "achievements/:username",
    component: AchievementsComponent,
    canActivate: [authGuard],
  },
  {
    path: "admin/statistics",
    loadComponent: () =>
      import(
        "./components/admin-statistics/admin-statistics.component"
      ).then((m) => m.AdminStatisticsComponent),
    canActivate: [authGuard],
    data: { roles: ["CEO", "ADMIN"] },
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
    path: "staking",
    loadComponent: () =>
      import(
        "./components/staking/staking.component"
      ).then((m) => m.StakingComponent),
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
    path: "admin-events/:id/metrics",
    loadComponent: () =>
      import(
        "./components/organizer-metrics/organizer-metrics.component"
      ).then((m) => m.OrganizerMetricsComponent),
    canActivate: [authGuard],
  },
  {
    path: "admin-venues",
    component: AdminVenuesComponent,
    canActivate: [authGuard],
  },
  {
    path: "admin-venues/approvals",
    loadComponent: () =>
      import(
        "./components/admin-venues-approval/admin-venues-approval.component"
      ).then((m) => m.AdminVenuesApprovalComponent),
    canActivate: [authGuard],
  },
  {
    path: "admin-events/approvals",
    loadComponent: () =>
      import(
        "./components/admin-events-approval/admin-events-approval.component"
      ).then((m) => m.AdminEventsApprovalComponent),
    canActivate: [authGuard],
  },
  {
    path: "event/:id",
    component: EventComponent,
  },
  {
    path: "event/:id/purchase-options",
    loadComponent: () =>
      import(
        "./components/purchase-options/purchase-options.component"
      ).then((m) => m.PurchaseOptionsComponent),
  },
  {
    path: "select-tickets/:id",
    component: TicketPurchaseComponent,
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
    path: "my-listings",
    component: MyListingsComponent,
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
  {
    path: "marketplace",
    component: MarketplaceListComponent,
  },
  {
    path: "marketplace/:listingId",
    component: MarketplaceDetailComponent,
  },
  {
    path: "admin-events/:id/validators",
    component: ValidatorManagementComponent,
    canActivate: [authGuard],
  },
  {
    path: "scanner",
    component: QrScannerComponent,
    canActivate: [authGuard, () => roleGuard(['validador'])],
  },
  {
    path: "cron-jobs",
    loadComponent: () =>
      import("./components/cron-jobs/cron-jobs.component").then((m) => m.CronJobsComponent),
    canActivate: [authGuard, () => roleGuard(['ADMIN'])],
  },
  { path: "**", component: NotFoundComponent },
];
