import { Component, inject, OnInit, OnDestroy, PLATFORM_ID, Inject, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { Html5Qrcode } from 'html5-qrcode';
import { TicketService } from '../../services/ticket.service';

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
export class QrScannerComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private ticketService = inject(TicketService);
  private platformId = inject(PLATFORM_ID);

  @ViewChild('reader', { static: false }) readerElement!: ElementRef;

  // Scanner states
  scanning = true;
  qrData: string | null = null;
  loading = false;
  result: 'success' | 'error' | null = null;
  errorMessage = '';

  // Camera permissions and devices
  hasCameraPermission = true;
  hasCameraSupport = true;
  availableDevices: any[] = [];
  selectedDeviceId: string | null = null;

  // Html5Qrcode instance
  html5QrCode: Html5Qrcode | null = null;

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      this.hasCameraSupport = false;
      return;
    }

    this.checkCameraSupport();
  }

  ngAfterViewInit(): void {
    if (this.hasCameraSupport && this.readerElement) {
      this.initializeScanner();
    }
  }

  ngOnDestroy(): void {
    this.stopScanner();
  }

  private checkCameraSupport(): void {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      this.hasCameraSupport = false;
      this.hasCameraPermission = false;
      return;
    }
  }

  private async initializeScanner(): Promise<void> {
    try {
      this.html5QrCode = new Html5Qrcode('reader');
      
      // Get available cameras
      const devices = await Html5Qrcode.getCameras();
      this.availableDevices = devices;

      if (devices && devices.length > 0) {
        // Select back camera by default for mobile
        const backCamera = devices.find(device => 
          device.label.toLowerCase().includes('back') || 
          device.label.toLowerCase().includes('environment')
        );
        this.selectedDeviceId = (backCamera || devices[0]).id;
        
        await this.startScanning(this.selectedDeviceId);
      } else {
        this.hasCameraSupport = false;
      }
    } catch (err) {
      console.error('Error initializing scanner:', err);
      this.hasCameraSupport = false;
    }
  }

  private async startScanning(deviceId: string): Promise<void> {
    if (!this.html5QrCode) return;

    try {
      await this.html5QrCode.start(
        deviceId,
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0
        },
        (decodedText) => this.onScanSuccess(decodedText),
        (errorMessage) => {
          // Handle scan errors silently
        }
      );
      this.scanning = true;
    } catch (err) {
      console.error('Error starting scanner:', err);
      this.hasCameraPermission = false;
    }
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

  private async pauseScanner(): Promise<void> {
    if (this.html5QrCode && this.html5QrCode.isScanning) {
      try {
        await this.html5QrCode.pause();
      } catch (err) {
        console.error('Error pausing scanner:', err);
      }
    }
  }

  private async resumeScanner(): Promise<void> {
    if (this.html5QrCode) {
      try {
        await this.html5QrCode.resume();
      } catch (err) {
        console.error('Error resuming scanner:', err);
      }
    }
  }

  onScanSuccess(decodedText: string): void {
    if (this.scanning && decodedText) {
      this.scanning = false;
      this.qrData = decodedText;
      this.pauseScanner();
    }
  }

  async switchCamera(): Promise<void> {
    if (this.availableDevices.length <= 1) return;

    await this.stopScanner();

    const currentIndex = this.availableDevices.findIndex(d => d.id === this.selectedDeviceId);
    const nextIndex = (currentIndex + 1) % this.availableDevices.length;
    this.selectedDeviceId = this.availableDevices[nextIndex].id;

    await this.startScanning(this.selectedDeviceId);
  }

  confirmValidation(): void {
    if (!this.qrData) return;

    this.loading = true;

    // Parse QR data - assuming it contains the ticket ID
    // The QR format might be just the ID or a JSON, adjust as needed
    let ticketId: number;
    try {
      // Try to parse as JSON first
      const parsed = JSON.parse(this.qrData);
      ticketId = parsed.ticketId || parsed.id || parseInt(this.qrData);
    } catch {
      // If not JSON, try to parse as plain number
      ticketId = parseInt(this.qrData);
    }

    if (isNaN(ticketId)) {
      this.loading = false;
      this.result = 'error';
      this.errorMessage = 'Formato de QR inválido. No se pudo extraer el ID del ticket.';
      return;
    }

    this.ticketService.redeemTicket(ticketId).subscribe({
      next: (response) => {
        this.loading = false;
        this.result = 'success';
      },
      error: (err) => {
        this.loading = false;
        this.result = 'error';
        this.errorMessage = err.error?.message || err.message || 'Error al validar la entrada';
      }
    });
  }

  async cancelScan(): Promise<void> {
    await this.resumeScanner();
    this.scanning = true;
    this.qrData = null;
    this.result = null;
    this.errorMessage = '';
  }

  async scanAnother(): Promise<void> {
    await this.resumeScanner();
    this.scanning = true;
    this.qrData = null;
    this.result = null;
    this.errorMessage = '';
  }

  async retry(): Promise<void> {
    await this.resumeScanner();
    this.scanning = true;
    this.qrData = null;
    this.result = null;
    this.errorMessage = '';
  }

  goBack(): void {
    this.router.navigate(['/dashboard']);
  }
}
