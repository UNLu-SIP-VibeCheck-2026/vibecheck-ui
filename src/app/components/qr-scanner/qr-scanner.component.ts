import { Component, inject, OnInit, AfterViewInit, OnDestroy, PLATFORM_ID, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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

interface ScanHistoryItem {
  ticketId: string;
  timestamp: Date;
  status: 'success' | 'error';
  message: string;
}

@Component({
  selector: 'app-qr-scanner',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
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

  // Collapsible history state
  historyCollapsed = true;

  // Recent validations log
  scanHistory: ScanHistoryItem[] = [];

  // Assigned Event details
  assignedEvent: EventResponse | null = null;
  assignedVenue: VenueResponse | null = null;
  eventImage: SafeUrl | null = null;
  loadingEvent = true;

  // Html5Qrcode instance
  html5QrCode: Html5Qrcode | null = null;
  private feedbackTimeout: any = null;
  private onDeviceChangeBound: any = null;

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      this.hasCameraSupport = false;
      this.loadingEvent = false;
      return;
    }

    this.checkCameraSupport();
    this.loadAssignedEvent();
    this.setupDeviceChangeObserver();
  }

  ngAfterViewInit(): void {
    if (this.hasCameraSupport && this.readerElement) {
      this.initializeScanner();
    }
  }

  ngOnDestroy(): void {
    this.stopScanner();
    this.teardownDeviceChangeObserver();
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

  private setupDeviceChangeObserver(): void {
    if (isPlatformBrowser(this.platformId) && navigator.mediaDevices && navigator.mediaDevices.addEventListener) {
      this.onDeviceChangeBound = () => {
        console.log('Cambio detectado en los dispositivos multimedia. Actualizando cámaras...');
        this.updateCameraList();
      };
      navigator.mediaDevices.addEventListener('devicechange', this.onDeviceChangeBound);
    }
  }

  private teardownDeviceChangeObserver(): void {
    if (isPlatformBrowser(this.platformId) && navigator.mediaDevices && navigator.mediaDevices.removeEventListener && this.onDeviceChangeBound) {
      navigator.mediaDevices.removeEventListener('devicechange', this.onDeviceChangeBound);
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
      
      // Query cameras first to make camera selection deterministic
      try {
        const devices = await Html5Qrcode.getCameras();
        this.availableDevices = devices || [];
      } catch (devicesErr) {
        console.warn('Could not retrieve camera list initially:', devicesErr);
        this.availableDevices = [];
      }

      if (this.availableDevices.length > 0) {
        // Prefer back camera
        const backCamera = this.availableDevices.find(device => 
          device.label.toLowerCase().includes('back') || 
          device.label.toLowerCase().includes('environment') ||
          device.label.toLowerCase().includes('trasera')
        );
        this.selectedDeviceId = (backCamera || this.availableDevices[0]).id;
        await this.startScanningWithDeviceId(this.selectedDeviceId);
      } else {
        // Fallback to environment facing mode
        await this.startScanningWithFacingMode('environment');
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
      this.errorMessage = err?.message || 'Cámara no disponible.';
    }
  }

  retryPermission(): void {
    this.hasCameraPermission = true;
    this.hasCameraSupport = true;
    this.initializeScanner();
  }

  async updateCameraList(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      const devices = await Html5Qrcode.getCameras();
      this.availableDevices = devices || [];
      
      if (this.availableDevices.length > 0) {
        const stillAvailable = this.availableDevices.some(d => d.id === this.selectedDeviceId);
        if (!stillAvailable) {
          console.warn('La cámara seleccionada ya no está disponible. Reconectando...');
          // Prefer back camera
          const backCamera = this.availableDevices.find(device => 
            device.label.toLowerCase().includes('back') || 
            device.label.toLowerCase().includes('environment') ||
            device.label.toLowerCase().includes('trasera')
          );
          this.selectedDeviceId = (backCamera || this.availableDevices[0]).id;
          
          if (this.html5QrCode && this.html5QrCode.isScanning) {
            await this.stopScanner();
            await this.startScanningWithDeviceId(this.selectedDeviceId);
          }
        }
      } else {
        console.error('Todas las cámaras han sido desconectadas.');
        this.selectedDeviceId = null;
        this.hasCameraSupport = false;
        this.errorMessage = 'No se encontraron cámaras conectadas al dispositivo.';
        await this.stopScanner();
      }
    } catch (err) {
      console.warn('Error al actualizar la lista de cámaras:', err);
    }
  }

  async refreshCameras(): Promise<void> {
    await this.updateCameraList();
    if (this.availableDevices.length > 0 && !this.html5QrCode?.isScanning) {
      this.hasCameraSupport = true;
      this.initializeScanner();
    }
  }

  async onCameraSelect(deviceId: string): Promise<void> {
    if (!deviceId || deviceId === this.selectedDeviceId) return;
    this.selectedDeviceId = deviceId;
    this.processing = true;

    await this.stopScanner();

    try {
      await this.startScanningWithDeviceId(deviceId);
      this.processing = false;
    } catch (err) {
      console.error('Error al cambiar a la cámara seleccionada:', err);
      this.handleScannerError(err);
      this.processing = false;
    }
  }

  async switchCamera(): Promise<void> {
    if (this.availableDevices.length <= 1) {
      return;
    }

    const currentIndex = this.availableDevices.findIndex(d => d.id === this.selectedDeviceId);
    const startIndex = currentIndex === -1 ? 0 : currentIndex;
    
    // Attempt subsequent devices in the list until one works
    let nextIndex = (startIndex + 1) % this.availableDevices.length;
    let attempts = 0;
    
    this.processing = true;
    await this.stopScanner();

    while (attempts < this.availableDevices.length) {
      const targetDevice = this.availableDevices[nextIndex];
      this.selectedDeviceId = targetDevice.id;
      
      try {
        console.log(`Intentando cambiar a cámara: ${targetDevice.label} (ID: ${targetDevice.id})`);
        await this.startScanningWithDeviceId(this.selectedDeviceId);
        this.processing = false;
        return; // Success!
      } catch (err) {
        console.warn(`Error al abrir cámara ${targetDevice.label}, probando la siguiente...`, err);
        nextIndex = (nextIndex + 1) % this.availableDevices.length;
        attempts++;
      }
    }
    
    // Fallback if all failed
    this.processing = false;
    this.hasCameraSupport = false;
    this.errorMessage = 'No se pudo conectar a ninguna de las cámaras detectadas.';
  }

  onScanSuccess(decodedText: string): void {
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
      this.showFeedback('error', 'Código QR', 'Formato de QR inválido.');
      return;
    }

    // Call redeemTicket
    this.ticketService.redeemTicket(ticketId).subscribe({
      next: (response) => {
        this.showFeedback('success', ticketId.toString());
      },
      error: (err) => {
        const msg = err.error?.message || err.message || 'Error al validar la entrada';
        this.showFeedback('error', ticketId.toString(), msg);
      }
    });
  }

  toggleHistory(): void {
    this.historyCollapsed = !this.historyCollapsed;
  }

  private showFeedback(type: 'success' | 'error', ticketId: string, message: string = ''): void {
    this.result = type;
    this.errorMessage = message;
    this.loading = false;

    // Log to validation history
    const finalMessage = message || (type === 'success' ? 'Entrada validada exitosamente' : 'Fallo en la validación');
    this.scanHistory.unshift({
      ticketId,
      timestamp: new Date(),
      status: type,
      message: finalMessage
    });

    // Keep log concise (e.g., last 12 items)
    if (this.scanHistory.length > 12) {
      this.scanHistory.pop();
    }

    // Haptic vibration feedback
    if (isPlatformBrowser(this.platformId) && navigator.vibrate) {
      try {
        if (type === 'success') {
          navigator.vibrate(150);
        } else {
          navigator.vibrate([100, 80, 100]);
        }
      } catch (e) {
        console.warn('Vibration blocked by user/browser permissions:', e);
      }
    }

    // Timer to reset scanner feedback overlay
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
