import { Component, Input } from "@angular/core";
import { CommonModule } from "@angular/common";
import { MatCardModule } from "@angular/material/card";
import { MatIconModule } from "@angular/material/icon";
import { MatButtonModule } from "@angular/material/button";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { TxState } from "../../../services/transaction.service";

@Component({
  selector: "app-tx-status",
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: "./tx-status.component.html",
  styleUrl: "./tx-status.component.scss",
})
export class TxStatusComponent {
  @Input() txState: TxState | null = null;

  get etherscanUrl(): string {
    if (this.txState && this.txState.hash) {
      return `https://sepolia.etherscan.io/tx/${this.txState.hash}`;
    }
    return "";
  }
}
