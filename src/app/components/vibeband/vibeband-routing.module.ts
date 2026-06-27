import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { VibebandPageComponent } from './vibeband-page.component';

const routes: Routes = [
  { path: '', component: VibebandPageComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class VibebandRoutingModule { }
