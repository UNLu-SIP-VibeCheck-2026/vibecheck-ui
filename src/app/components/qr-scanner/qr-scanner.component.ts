import { Component, inject, OnInit, AfterViewInit, OnDestroy, PLATFORM_ID, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { Html5Qrcode } from 'html5-qrcode';
import { TicketService } from '../../services/ticket.service';
import { UsersService } from '../../services/users.service';
import { VenueService } from '../../services/venue.service';
import { EventService } from '../../services/event.service';
import { EventResponse } from '../../models/event.model';
import { VenueResponse } from '../../models/venue.model';

@Component({
  selector: 'app-qr-scanner',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './qr-scanner.component.html',
  styleUrl: './qr-scanner.component.scss'
})
export class QrScannerComponent implements OnInit, AfterViewInit, OnDestroy {
  private router = inject(Router);
  private ticketService = inject(TicketService);
  private usersService = inject(UsersService);
  private venueService = inject(VenueService);
  private eventService = inject(EventService);
  private sanitizer = inject(DomSanitizer);
  private platformId = inject(PLATFORM_ID);

  @ViewChild('reader', { static: false }) readerElement!: ElementRef;

  // Scanner states
  scanning = true;
  processing = false;
  loading = false;
  result: 'success' | 'error' | null = null;
  errorMessage = '';

  // Camera permissions and devices
  hasCameraPermission = true;
  hasCameraSupport = true;
  availableDevices: any[] = [];
  selectedDeviceId: string | null = null;

  // Assigned Event details
  assignedEvent: EventResponse | null = null;
  assignedVenue: VenueResponse | null = null;
  eventImage: SafeUrl | null = null;
  loadingEvent = true;

  // Html5Qrcode instance
  html5QrCode: Html5Qrcode | null = null;
  private feedbackTimeout: any = null;

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      this.hasCameraSupport = false;
      this.loadingEvent = false;
      return;
    }

    this.checkCameraSupport();
    this.loadAssignedEvent();
  }

  ngAfterViewInit(): void {
    if (this.hasCameraSupport && this.readerElement) {
      this.initializeScanner();
    }
  }

  ngOnDestroy(): void {
    this.stopScanner();
    if (this.feedbackTimeout) {
      clearTimeout(this.feedbackTimeout);
    }
  }

  private checkCameraSupport(): void {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      this.hasCameraSupport = false;
      this.hasCameraPermission = false;
      return;
    }
  }

  private loadAssignedEvent(): void {
    this.loadingEvent = true;
    this.usersService.getAssignedEvent().subscribe({
      next: (event) => {
        this.loadingEvent = false;
        if (event) {
          this.assignedEvent = event;
          
          // Fetch venue details
          if (event.venueId) {
            this.venueService.findVenueById(event.venueId).subscribe({
              next: (venue) => {
                this.assignedVenue = venue;
              },
              error: (err) => console.error('Error fetching venue details:', err)
            });
          }

          // Fetch event image
          if (event.hasImage) {
            this.eventService.getEventImage(event.id).subscribe({
              next: (blob) => {
                this.eventImage = this.sanitizer.bypassSecurityTrustUrl(URL.createObjectURL(blob));
              },
              error: (err) => console.error('Error fetching event image:', err)
            });
          }
        }
      },
      error: (err) => {
        console.error('Error loading assigned event:', err);
        this.loadingEvent = false;
      }
    });
  }

  private async initializeScanner(): Promise<void> {
    try {
      this.html5QrCode = new Html5Qrcode('reader');
      
      // Start scanning directly with back camera facing mode
      await this.startScanningWithFacingMode('environment');
      
      // Once started successfully, we have permission. Now fetch cameras to see if we can switch.
      try {
        const devices = await Html5Qrcode.getCameras();
        this.availableDevices = devices || [];
        if (devices && devices.length > 0) {
          const backCamera = devices.find(device => 
            device.label.toLowerCase().includes('back') || 
            device.label.toLowerCase().includes('environment') ||
            device.label.toLowerCase().includes('trasera')
          );
          this.selectedDeviceId = (backCamera || devices[0]).id;
        }
      } catch (devicesErr) {
        console.warn('Could not retrieve camera list for switching:', devicesErr);
        this.availableDevices = [];
      }
    } catch (err: any) {
      console.error('Error initializing scanner:', err);
      this.handleScannerError(err);
    }
  }

  private async startScanningWithFacingMode(facingMode: 'environment' | 'user'): Promise<void> {
    if (!this.html5QrCode) return;

    await this.html5QrCode.start(
      { facingMode: facingMode },
      {
        fps: 10,
        aspectRatio: 1.0
      },
      (decodedText) => this.onScanSuccess(decodedText),
      (errorMessage) => {
        // Handle scan errors silently
      }
    );
    this.scanning = true;
    this.hasCameraPermission = true;
    this.hasCameraSupport = true;
  }

  private async startScanningWithDeviceId(deviceId: string): Promise<void> {
    if (!this.html5QrCode) return;

    await this.html5QrCode.start(
      deviceId,
      {
        fps: 10,
        aspectRatio: 1.0
      },
      (decodedText) => this.onScanSuccess(decodedText),
      (errorMessage) => {
        // Handle scan errors silently
      }
    );
    this.scanning = true;
    this.hasCameraPermission = true;
    this.hasCameraSupport = true;
  }

  private async stopScanner(): Promise<void> {
    if (this.html5QrCode && this.html5QrCode.isScanning) {
      try {
        await this.html5QrCode.stop();
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
    }
  }

  private handleScannerError(err: any): void {
    const errorStr = (err?.message || err || '').toLowerCase();
    const errorName = err?.name || '';
    
    if (
      errorName === 'NotAllowedError' || 
      errorName === 'PermissionDeniedError' || 
      errorStr.includes('permission') || 
      errorStr.includes('denied') ||
      errorStr.includes('allowed') ||
      errorStr.includes('notallowed')
    ) {
      this.hasCameraPermission = false;
      this.hasCameraSupport = true;
    } else {
      this.hasCameraSupport = false;
    }
  }

  retryPermission(): void {
    this.hasCameraPermission = true;
    this.hasCameraSupport = true;
    this.initializeScanner();
  }

  onScanSuccess(decodedText: string): void {
    // If scanner is not active, or we are already processing a QR code, ignore
    if (!this.scanning || this.processing || !decodedText) {
      return;
    }

    this.processing = true;
    this.loading = true;
    this.result = null;
    this.errorMessage = '';

    // Extract ticketId from QR data
    let ticketId: number;
    try {
      const parsed = JSON.parse(decodedText);
      ticketId = parsed.ticketId || parsed.id || parseInt(decodedText);
    } catch {
      ticketId = parseInt(decodedText);
    }

    if (isNaN(ticketId)) {
      this.showFeedback('error', 'Formato de QR inválido.');
      return;
    }

    // Call redeemTicket immediately
    this.ticketService.redeemTicket(ticketId).subscribe({
      next: (response) => {
        this.showFeedback('success');
      },
      error: (err) => {
        const msg = err.error?.message || err.message || 'Error al validar la entrada';
        this.showFeedback('error', msg);
      }
    });
  }

  private showFeedback(type: 'success' | 'error', message: string = ''): void {
    this.result = type;
    this.errorMessage = message;
    this.loading = false;

    // Haptic feedback
    if (isPlatformBrowser(this.platformId) && navigator.vibrate) {
      try {
        if (type === 'success') {
          navigator.vibrate(150);
        } else {
          navigator.vibrate([100, 80, 100]);
        }
      } catch (e) {
        console.warn('Vibration not supported or blocked by browser/user permissions:', e);
      }
    }

    // Timer to reset scanner state and resume continuous scanning
    const duration = type === 'success' ? 1500 : 2500;
    if (this.feedbackTimeout) {
      clearTimeout(this.feedbackTimeout);
    }
    this.feedbackTimeout = setTimeout(() => {
      this.resetScannerState();
    }, duration);
  }

  private resetScannerState(): void {
    this.result = null;
    this.errorMessage = '';
    this.processing = false;
    this.loading = false;
  }

  async switchCamera(): Promise<void> {
    if (this.availableDevices.length <= 1 || !this.selectedDeviceId) return;

    await this.stopScanner();

    const currentIndex = this.availableDevices.findIndex(d => d.id === this.selectedDeviceId);
    const nextIndex = (currentIndex + 1) % this.availableDevices.length;
    this.selectedDeviceId = this.availableDevices[nextIndex].id;

    try {
      await this.startScanningWithDeviceId(this.selectedDeviceId);
    } catch (err) {
      console.error('Error switching camera:', err);
      this.handleScannerError(err);
    }
  }

  formatDate(dateStr: string | null | undefined): string {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleString('es-AR', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  }

  get venueName(): string {
    return this.assignedVenue?.title ?? (this.assignedEvent?.venueId ? `Venue #${this.assignedEvent.venueId}` : 'Cargando locación...');
  }

  goBack(): void {
    this.router.navigate(['/dashboard']);
  }
}
