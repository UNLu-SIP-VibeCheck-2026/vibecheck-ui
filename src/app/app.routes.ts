import {Routes} from '@angular/router';
import {LoginComponent} from './components/login/login.component';
import {RegisterComponent} from './components/register/register.component';
import {HomeComponent} from "./components/home/home.component";
import {PasswordRecoveryComponent} from "./components/password-recovery/password-recovery.component";
import {PerfilConfigComponent} from "./components/perfil-config/perfil-config.component";
import {PerfilUserComponent} from "./components/perfil-user/perfil-user.component";
import {AdminPermissionsComponent} from "./components/admin-permissions/admin-permissions.component";
import {AdminRolesComponent} from "./components/admin-roles/admin-roles.component";
import {AdminUsersComponent} from "./components/admin-users/admin-users.component";

export const routes: Routes = [
    {path: 'home', component: HomeComponent},
    {path: 'pass-recovery', component: PasswordRecoveryComponent},
    {path: 'perfil-config', component: PerfilConfigComponent},
    {path: 'perfil-user', component: PerfilUserComponent},
    {path: 'admin-permissions', component: AdminPermissionsComponent},
    {path: 'admin-roles', component: AdminRolesComponent},
    {path: 'admin-users', component: AdminUsersComponent},
    {path: 'login', component: LoginComponent},
    {path: 'register', component: RegisterComponent},
    {path: '', redirectTo: '/home', pathMatch: 'full'},
    {path: '**', redirectTo: '/home'}
];
