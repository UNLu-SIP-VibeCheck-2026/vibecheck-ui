import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { provideRouter } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { of } from 'rxjs';

import { PerfilUserComponent } from './perfil-user.component';
import { UsersService } from '../../services/users.service';
import { AuthService } from '../../services/auth.service';
import { AchievementService } from '../../services/achievement.service';
import { TicketService } from '../../services/ticket.service';
import { EventService } from '../../services/event.service';
import { VenueService } from '../../services/venue.service';
import { HistoryService } from '../../services/history.service';

describe('PerfilUserComponent', () => {
  let component: PerfilUserComponent;
  let fixture: ComponentFixture<PerfilUserComponent>;
  let usersService: jasmine.SpyObj<UsersService>;
  let authService: jasmine.SpyObj<AuthService>;
  let achievementService: jasmine.SpyObj<AchievementService>;
  let ticketService: jasmine.SpyObj<TicketService>;
  let historyService: jasmine.SpyObj<HistoryService>;

  const emptyPage = (content: any[] = []) => ({
    content,
    totalPages: content.length ? 1 : 0,
    totalElements: content.length,
    number: 0,
    size: 10,
    first: true,
    last: true,
    empty: content.length === 0,
    numberOfElements: content.length,
    pageable: {} as any,
    sort: {} as any,
  });

  beforeEach(async () => {
    usersService = jasmine.createSpyObj<UsersService>('UsersService', [
      'getPublicUser',
      'getProfileImage',
      'updateUser',
    ], {
      profileUpdated$: of('alice'),
    });
    authService = jasmine.createSpyObj<AuthService>('AuthService', [
      'getCurrentUserValue',
      'refreshToken',
    ]);
    achievementService = jasmine.createSpyObj<AchievementService>('AchievementService', ['getMyAchievements', 'getAchievementsForUser']);
    ticketService = jasmine.createSpyObj<TicketService>('TicketService', ['getMyTickets']);
    historyService = jasmine.createSpyObj<HistoryService>('HistoryService', ['getMyHistory', 'getUserHistory', 'updateVisibility']);

    usersService.getPublicUser.and.returnValue(of({
      username: 'alice',
      name: 'Alice',
      lastName: 'Vibes',
      role: 'USER',
      tier: 'BRONZE',
      hasImage: false,
    } as any));
    usersService.getProfileImage.and.returnValue(of(new Blob()));
    authService.getCurrentUserValue.and.returnValue({ username: 'alice', role: 'USER' } as any);
    achievementService.getMyAchievements.and.returnValue(of([]));
    achievementService.getAchievementsForUser.and.returnValue(of([]));
    ticketService.getMyTickets.and.returnValue(of(emptyPage()));
    historyService.getMyHistory.and.returnValue(of(emptyPage()));
    historyService.getUserHistory.and.returnValue(of(emptyPage()));

    await TestBed.configureTestingModule({
      imports: [PerfilUserComponent],
      providers: [
        provideRouter([]),
        provideAnimations(),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: (key: string) => key === 'username' ? 'alice' : null,
              },
            },
          },
        },
        { provide: UsersService, useValue: usersService },
        { provide: AuthService, useValue: authService },
        { provide: AchievementService, useValue: achievementService },
        { provide: TicketService, useValue: ticketService },
        { provide: EventService, useValue: jasmine.createSpyObj<EventService>('EventService', ['findByIdEvent', 'getEventImage']) },
        { provide: VenueService, useValue: jasmine.createSpyObj<VenueService>('VenueService', ['findVenueById']) },
        { provide: HistoryService, useValue: historyService },
      ]
    })
    .compileComponents();
  });

  it('should create', () => {
    fixture = TestBed.createComponent(PerfilUserComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component).toBeTruthy();
  });

  it('renders owner history items', () => {
    historyService.getUserHistory.and.returnValue(of(emptyPage([
      {
        id: 1,
        eventId: 1,
        eventTitle: 'Vibe Fest',
        eventStartDate: '2026-06-01T21:00:00Z',
        attendedAt: '2026-06-01T22:05:00Z',
        ticketTypeName: 'General',
        tokenId: 42,
        ownerWalletAtRedeem: '0x1234567890abcdef1234567890abcdef12345678',
        redeemTxHash: '0xabcdef1234567890abcdef1234567890abcdef12',
        publicVisibility: true
      },
    ])));

    fixture = TestBed.createComponent(PerfilUserComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Eventos Asistidos');
    expect(text).toContain('Vibe Fest');
    expect(text).toContain('General');
    expect(historyService.getUserHistory).toHaveBeenCalledWith('alice', 0, 4, 'attendedAt,desc');
  });

  it('shows history empty state for owner profile', () => {
    fixture = TestBed.createComponent(PerfilUserComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Todavía no asistió a eventos.');
  });

  it('does not show visibility toggle buttons for a public profile visitor', () => {
    authService.getCurrentUserValue.and.returnValue({ username: 'bob', role: 'USER' } as any);
    historyService.getUserHistory.and.returnValue(of(emptyPage([
      {
        id: 1,
        eventId: 1,
        eventTitle: 'Vibe Fest',
        eventStartDate: '2026-06-01T21:00:00Z',
        attendedAt: '2026-06-01T22:05:00Z',
        ticketTypeName: 'General',
        tokenId: 42,
        ownerWalletAtRedeem: '0x1234567890abcdef1234567890abcdef12345678',
        redeemTxHash: '0xabcdef1234567890abcdef1234567890abcdef12',
        publicVisibility: true
      },
    ])));

    fixture = TestBed.createComponent(PerfilUserComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Vibe Fest');
    const toggleBtn = fixture.nativeElement.querySelector('.visibility-toggle-btn');
    expect(toggleBtn).toBeNull();
  });
});
