import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatDialogModule } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-gift-ticket',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    MatCardModule, 
    MatButtonModule, 
    MatIconModule, 
    MatFormFieldModule, 
    MatInputModule,
    MatListModule,
    MatDialogModule
  ],
  templateUrl: './gift-ticket.component.html',
  styleUrl: './gift-ticket.component.scss'
})
export class GiftTicketComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  ticketId: string | null = null;
  searchQuery = '';
  selectedUser: any = null;
  
  friends = [
    { id: 1, username: 'juan_perez', fullName: 'Juan Perez', photo: 'https://i.pravatar.cc/150?u=1' },
    { id: 2, username: 'ana_musica', fullName: 'Ana Martinez', photo: 'https://i.pravatar.cc/150?u=2' },
    { id: 3, username: 'rocker99', fullName: 'Carlos Rock', photo: 'https://i.pravatar.cc/150?u=3' }
  ];

  filteredFriends = this.friends;

  ngOnInit(): void {
    window.scrollTo(0, 0);
    this.ticketId = this.route.snapshot.paramMap.get('id');
  }

  onSearch(): void {
    this.filteredFriends = this.friends.filter(f => 
      f.username.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
      f.fullName.toLowerCase().includes(this.searchQuery.toLowerCase())
    );
  }

  selectUser(user: any): void {
    this.selectedUser = user;
  }

  confirmGift(): void {
    if (confirm(`¿Estás seguro de que quieres regalar esta entrada a @${this.selectedUser.username}? Esta acción no se puede deshacer.`)) {
      alert('Entrada enviada correctamente!');
      this.router.navigate(['/my-tickets']);
    }
  }

  goBack(): void {
    window.history.back();
  }
}
