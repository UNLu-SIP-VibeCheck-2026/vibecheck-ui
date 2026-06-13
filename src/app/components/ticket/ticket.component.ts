import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { ActivatedRoute, Router } from '@angular/router';
import { TicketService } from '../../services/ticket.service';
import { environment } from '../../../environments/environment';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { EventService } from '../../services/event.service';
import { VenueService } from '../../services/venue.service';
import { Web3Service } from '../../services/web3.service';
import { RefundRequestResponse } from '../../models/ticket.model';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-ticket',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule, MatButtonModule, MatProgressSpinnerModule],
  templateUrl: './ticket.component.html',
  styleUrl: './ticket.component.scss'
})
export class TicketComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  ticket: any = null;
  isQrVisible = false;
  isQrLoading = signal<boolean>(true);

  private ticketService = inject(TicketService);
  private sanitizer = inject(DomSanitizer);
  private eventService = inject(EventService);
  private venueService = inject(VenueService);
  private web3Service = inject(Web3Service);

  // Refund state signals
  isLoadingRefund = signal<boolean>(false);
  refundError = signal<string>('');
  refundStep = signal<'idle' | 'requesting' | 'awaitingWallet' | 'confirming' | 'done'>('idle');

  // Preloaded request for the Safari gesture constraint
  pendingRefund: RefundRequestResponse | null = null;
  isRefundModalVisible = false;

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    this.loadTicket(id);
  }

  formatDate(dateStr: string | null | undefined): string {
    if (!dateStr) return "—";
    try {
      const formatted = new Date(dateStr).toLocaleString("es-AR", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
      return formatted.charAt(0).toUpperCase() + formatted.slice(1);
    } catch {
      return dateStr;
    }
  }

  loadTicket(id: string | null): void {
    if (!id) return;
    
    this.ticketService.getTicketById(Number(id)).subscribe({
        next: (t) => {
            const qrPayload = JSON.stringify({ ticketId: t.id });

            this.ticket = {
                id: t.id.toString(),
                status: t.status,
                tokenId: t.tokenId,
                eventNftAddress: t.eventNftAddress,
                eventTitle: 'Cargando evento...',
                description: t.ticketType.description,
                startDate: 'Cargando fecha...',
                endDate: 'Cargando fecha...',
                venue: 'Cargando sede...',
                address: 'Cargando dirección...',
                ticketType: t.ticketType.name,
                location: t.ticketType.hasSeats ? `Fila ${t.seatRow} - Asiento ${t.seatNumber}` : 'Entrada General',
                qrCode: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrPayload)}`
            };

            // Load event details
            this.eventService.findByIdEvent(t.ticketType.eventId).subscribe({
                next: (event) => {
                    this.ticket.eventTitle = event.title;
                    this.ticket.description = event.description || t.ticketType.description;
                    this.ticket.startDate = this.formatDate(event.startDate);
                    this.ticket.endDate = this.formatDate(event.endDate);
                    
                    if (event.venueId) {
                        this.venueService.findVenueById(event.venueId).subscribe({
                            next: (venue) => {
                                this.ticket.venue = venue.title;
                                this.ticket.address = venue.coordinates || 'Sin dirección registrada';
                            },
                            error: () => {
                                this.ticket.venue = 'Dirección no disponible';
                                this.ticket.address = 'No disponible';
                            }
                        });
                    } else {
                        this.ticket.venue = 'Sin sede asignada';
                        this.ticket.address = 'No disponible';
                    }
                },
                error: (err) => {
                    this.ticket.eventTitle = 'Evento ID: ' + t.ticketType.eventId;
                    this.ticket.startDate = this.formatDate(t.ticketType.saleStartDate);
                    this.ticket.endDate = this.formatDate(t.ticketType.saleEndDate);
                    this.ticket.venue = 'No disponible';
                    this.ticket.address = 'No disponible';
                }
            });
            
            this.eventService.getEventImage(t.ticketType.eventId).subscribe({
                next: (blob) => this.ticket.imageUrl = this.sanitizer.bypassSecurityTrustUrl(URL.createObjectURL(blob)),
                error: (err) => console.error("No image found for event", t.ticketType.eventId)
            });
        },
        error: (err) => {
            console.error('Error fetching ticket', err);
        }
    });
  }

  toggleQR(): void {
    this.isQrVisible = !this.isQrVisible;
    if (this.isQrVisible) {
      this.isQrLoading.set(true);
    }
  }

  onQrLoad(): void {
    this.isQrLoading.set(false);
  }

  giftTicket(): void {
    this.router.navigate(['/gift-ticket', this.ticket.id]);
  }

  resellTicket(): void {
    this.router.navigate(['/resell-ticket', this.ticket.id]);
  }

  openRefundModal(): void {
    if (!this.ticket) return;
    this.isRefundModalVisible = true;
    this.refundStep.set('requesting');
    this.refundError.set('');
    this.isLoadingRefund.set(true);
    this.pendingRefund = null;

    this.ticketService.requestVoluntaryRefund(Number(this.ticket.id)).subscribe({
      next: (res) => {
        this.pendingRefund = res;
        this.refundStep.set('idle');
        this.isLoadingRefund.set(false);
      },
      error: (err) => {
        console.error('Error preloading refund request:', err);
        this.refundError.set(err.error?.message || 'Error al obtener la autorización de reembolso.');
        this.refundStep.set('idle');
        this.isLoadingRefund.set(false);
      }
    });
  }

  closeRefundModal(): void {
    this.isRefundModalVisible = false;
    this.refundStep.set('idle');
    this.refundError.set('');
    this.isLoadingRefund.set(false);
    this.pendingRefund = null;
  }

  confirmRefund(): void {
    if (!this.pendingRefund) {
      this.refundError.set('Preparando reembolso, por favor intente nuevamente...');
      if (this.ticket) {
        this.openRefundModal();
      }
      return;
    }

    const chainId = this.web3Service.chainId$.getValue();
    if (chainId !== 11155111) {
      this.refundError.set('Cambiá a la red Sepolia en tu wallet antes de continuar.');
      this.web3Service.switchToSepolia().catch(() => {});
      return;
    }

    const refundData = this.pendingRefund;
    this.pendingRefund = null;
    
    this.isLoadingRefund.set(true);
    this.refundError.set('');
    this.refundStep.set('awaitingWallet');

    this.web3Service.refundVoluntary(
      refundData.eventNftAddress,
      refundData.tokenId,
      refundData.deadline,
      refundData.signature
    ).then((receipt: any) => {
      this.refundStep.set('confirming');
      
      const txHash = receipt.transactionHash;
      this.ticketService.confirmVoluntaryRefund(Number(this.ticket.id), txHash).subscribe({
        next: (updatedTicket) => {
          this.isLoadingRefund.set(false);
          this.refundStep.set('done');
          if (this.ticket) {
            this.ticket.status = updatedTicket.status;
            this.ticket = { ...this.ticket };
          }
          setTimeout(() => {
            this.closeRefundModal();
          }, 1500);
        },
        error: (err) => {
          console.error('Error al confirmar reembolso en backend:', err);
          this.isLoadingRefund.set(false);
          this.refundError.set(`El reembolso se ejecutó on-chain pero no se registró en el sistema. Contactá soporte con el txHash: ${txHash}`);
        }
      });
    }).catch((err: any) => {
      this.isLoadingRefund.set(false);
      this.refundStep.set('idle');
      console.error('Error during on-chain transaction:', err);
      this.handleRefundError(err);
      
      if (this.ticket) {
        this.ticketService.requestVoluntaryRefund(Number(this.ticket.id)).subscribe({
          next: (res) => {
            this.pendingRefund = res;
          },
          error: (preloadErr) => {
            console.error('Error re-preloading refund request:', preloadErr);
          }
        });
      }
    });
  }

  handleRefundError(err: any): void {
    if (err.code === 4001 || err.code === 'ACTION_REJECTED' || (err.message && err.message.includes('rejected'))) {
      this.refundError.set('Cancelaste la operación en tu wallet.');
    } else if (
      err.code === 'INSUFFICIENT_FUNDS' ||
      (err.message && err.message.toLowerCase().includes('insufficient funds')) ||
      (err.message && err.message.toLowerCase().includes('transfer amount exceeds balance'))
    ) {
      this.refundError.set('Saldo insuficiente de gas para realizar la transacción.');
    } else if (err.reason) {
      this.refundError.set(err.reason);
    } else {
      this.refundError.set(err.message || 'Ocurrió un error inesperado en la transacción.');
    }
  }

  goBack(): void {
    this.router.navigate(['/my-tickets']);
  }
}

