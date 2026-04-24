import { CommonModule } from "@angular/common";
import { Component, inject, OnInit, signal } from "@angular/core";
import { UserInfo } from "../components/features/user-info/user-info.component";
import { MatIconModule } from "@angular/material/icon";
import { BookingsService, RoomsService, SessionDetail, Teacher, TeachersService } from "../apis";
import { Router } from "@angular/router";
import { firstValueFrom, forkJoin, of } from "rxjs";
import { catchError } from "rxjs/operators";
import { StudentClassBoardComponent } from "../components/features/student/class-board/class-board.component";
import { StudentScheduleBoardComponent } from "../components/features/student/schedule-board/schedule-board.component";
import { UserService } from "../services/user.service";
import { ClassListStore } from "../stores/class.store";
import { SessionListStore } from "../stores/session.store";

type SessionJoinState = 'ongoing' | 'upcoming' | 'finished';

type BookedTutorCard = {
    tutor: Teacher;
    status: string;
    nextSlot: string | null;
    isBooked: boolean;
};

@Component({
    selector: 'app-dashboard',
    imports: [CommonModule, UserInfo, MatIconModule, StudentClassBoardComponent, StudentScheduleBoardComponent],
    template: `
        <style>
            .box { display: flex; align-items: flex-start; width: 100%; height: 100vh; overflow: hidden; }
            .center { flex: 1; padding: 30px; height: 100vh; box-sizing: border-box; overflow: auto; scrollbar-width: none; }
            .title { font-size: 14px; font-weight: 500; }
            app-user-info { flex: 0 0 260px; height: 100vh; overflow: auto; position: sticky; top: 0; align-self: flex-start; }
            .ic { padding: 5px; background-color: #6b46c1; border-radius: 5px; cursor: pointer; }
            .ic mat-icon { height: 15px; width: 15px; font-size: 15px; color: white; }
            .card-container { gap: 20px; width: 100%; }
            .card-item { background-color: white; border-radius: 10px; padding: 15px; gap: 10px; }
            .count { color: black; font-size: 12px; height: 20px; width: 20px; text-align: center; font-weight: 500; }
            .subject { color: black; margin-right: 25px; }
            .subject span { font-size: 12px; font-weight: 500; }
            .subject p { font-size: 10px; }
            .icon { color: white; border-radius: 8px; padding: 10px; background-color: #7f54e4ff; mat-icon { height: 15px; width: 15px; font-size: 15px; } }
            .board-container { display: flex; justify-content: center; width: 100%; gap: 20px; }
            .label span { font-size: 12px; font-weight: 500; }
            .label mat-icon { height: 15px; width: 15px; font-size: 15px; }
            .center::-webkit-scrollbar, app-user-info::-webkit-scrollbar { display: none; width: 0; height: 0; }
            .center, app-user-info { scrollbar-width: none; }
            .booking { width: 100%; }
            app-student-schedule-board { width: 55%; }
            app-student-class-board { width: 45%; }
        </style>

        <div class="box">
            @if (user().role === 'student') {
                <div class="center">
                    <div class="title flex-betw">
                        <span>Dashboard</span>
                        <div class="flex-cen" style="gap: 15px;">
                            <p style="color: #acacacff; font-size: 12px;">{{ today | date:'fullDate'}}</p>
                        </div>
                    </div>

                    <div class="card-container flex-cen mt-20">
                        <div class="card-item flex-cen">
                            <div class="icon flex-cen">
                                <mat-icon>alarm</mat-icon>
                            </div>
                            <div class="subject flex-col">
                                <span>Hours</span>
                                <p>Description</p>
                            </div>
                            <div class="count flex-cen">
                                08
                            </div>
                        </div>

                        <div class="card-item flex-cen" style="background-color: white;">
                            <div class="icon flex-cen" style="background-color: #8e82caff;">
                                <mat-icon>folder_open</mat-icon>
                            </div>
                            <div class="subject flex-col">
                                <span>Class</span>
                                <p>Description</p>
                            </div>
                            <div class="count flex-cen">12</div>
                        </div>

                        <div class="card-item flex-cen" style="background-color: white;">
                            <div class="icon flex-cen" style="background-color: #514fe3ff;">
                                <mat-icon>event</mat-icon>
                            </div>
                            <div class="subject flex-col">
                                <span>Session</span>
                                <p>Description</p>
                            </div>
                            <div class="count flex-cen">03</div>
                        </div>
                        
                        <div class="card-item flex-cen" style="background-color: white;">
                            <div class="icon flex-cen" style="background-color: #bb295fff;">
                                <mat-icon>mark_chat_unread</mat-icon>
                            </div>
                            <div class="subject flex-col">
                                <span>Message</span>
                                <p>Description</p>
                            </div>
                            <div class="count flex-cen">05</div>
                        </div>
                    </div>

                    <div class="board-container mt-20">
                        <app-student-class-board
                            [classes]="classes()"
                            [currentValue]="currentValue"
                            [maxValue]="maxValue">
                        </app-student-class-board>

                        <app-student-schedule-board
                            [sessions]="sessions()"
                            [joiningSessionId]="joiningSessionId()"
                            (joinSession)="joinSession($event)">
                        </app-student-schedule-board>
                    </div>

                    <div class="label flex-betw mt-20">
                        <span>Your Bookings</span>
                        <div class="flex-cen" style="gap: 10px; cursor: pointer;" (click)="navigateToBooking()"> 
                            <span>More</span>
                            <mat-icon>arrow_right_alt</mat-icon>
                        </div>
                    </div>
                    <div class="booking mt-20 flex-cen" style="gap: 20px; padding: 0;">
                        @for (card of bookedTutorCards(); track card.tutor.id) {
                        <div style="flex: 1; background-color: white; border-radius: 10px; padding: 15px; box-sizing: border-box; display: flex; flex-direction: column; gap: 12px;">
                            <div class="flex-cen" style="gap: 12px;">
                                <img [src]="card.tutor.img || 'default-avatar.jpg'" alt="avatar" style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover;">
                                <div class="flex-col" style="gap: 4px; flex: 1;">
                                    <span style="font-size: 12px; font-weight: 500;">{{ card.tutor.name }}</span>
                                    <p style="font-size: 10px; color: #acacacff; margin: 0;">{{ card.tutor.role === 'tutor' ? 'Tutor' : 'Teacher' }}</p>
                                </div>
                                @if (card.isBooked) {
                                <div [ngStyle]="{'background-color': getBookingStatusColor(card.status)}" style="padding: 4px 8px; border-radius: 4px;" class="flex-cen">
                                    <span style="font-size: 9px; color: white; font-weight: 500;">{{ getBookingStatusLabel(card.status) }}</span>
                                </div>
                                }
                            </div>
                            <div style="border-bottom: 1px solid #f1f1f1;"></div>
                            <div class="flex-col" style="gap: 8px;">
                                <div class="flex-betw">
                                    <span style="font-size: 11px; color: #acacacff;">Email:</span>
                                    <span style="font-size: 11px; font-weight: 500;">{{ card.tutor.email }}</span>
                                </div>
                                @if (card.tutor.rating) {
                                <div class="flex-betw">
                                    <span style="font-size: 11px; color: #acacacff;">Rating:</span>
                                    <span style="font-size: 11px; font-weight: 500;">{{ card.tutor.rating }}/5</span>
                                </div>
                                }
                                <div class="flex-betw">
                                    <span style="font-size: 11px; color: #acacacff;">{{ card.isBooked ? 'Next Session:' : 'Status:' }}</span>
                                    <span style="font-size: 11px; font-weight: 500;">{{ card.isBooked ? (card.nextSlot || 'No upcoming') : 'Not booked' }}</span>
                                </div>
                            </div>
                            <button [ngStyle]="{'background-color': card.isBooked ? getBookingStatusColor(card.status) : '#6b46c1'}" style="color: white; border: none; border-radius: 5px; padding: 8px; font-size: 11px; font-weight: 500; cursor: pointer; transition: all 0.3s ease;" (click)="navigateToBooking()">{{ card.isBooked ? 'View Details' : 'Book Session' }}</button>
                        </div>
                        }
                    </div>
                </div>
            }
    
            @if (user().role === 'teacher' || user().role === 'tutor') {
                <div class="center">
                    <div class="title flex-betw">
                        <span>Dashboard</span>
                        <div class="flex-cen" style="gap: 15px;">
                            <p style="color: #acacacff; font-size: 12px;">{{ today | date:'fullDate'}}</p>
                            <div class="ic flex-cen">
                                <mat-icon>search</mat-icon>
                            </div>
                        </div>
                    </div>

                    <div class="label flex-betw mt-20">
                        <span>Your Courses</span>
                        <div class="flex-cen" style="gap: 10px;"> 
                            <span>More</span>
                            <mat-icon>arrow_right_alt</mat-icon>
                        </div>
                    </div>

                    <div class="card-container flex-cen mt-20">
                        <div class="card-item flex-cen">
                            <div class="icon flex-cen">
                                <mat-icon>alarm</mat-icon>
                            </div>
                            <div class="subject flex-col">
                                <span>Hours</span>
                                <p>Description</p>
                            </div>
                            <div class="count flex-cen">
                                08
                            </div>
                        </div>

                        <div class="card-item flex-cen" style="background-color: white;">
                            <div class="icon flex-cen" style="background-color: #8e82caff;">
                                <mat-icon>folder_open</mat-icon>
                            </div>
                            <div class="subject flex-col">
                                <span>Class</span>
                                <p>Description</p>
                            </div>
                            <div class="count flex-cen">12</div>
                        </div>

                        <div class="card-item flex-cen" style="background-color: white;">
                            <div class="icon flex-cen" style="background-color: #514fe3ff;">
                                <mat-icon>event</mat-icon>
                            </div>
                            <div class="subject flex-col">
                                <span>Session</span>
                                <p>Description</p>
                            </div>
                            <div class="count flex-cen">03</div>
                        </div>
                        
                        <div class="card-item flex-cen" style="background-color: white;">
                            <div class="icon flex-cen" style="background-color: #bb295fff;">
                                <mat-icon>mark_chat_unread</mat-icon>
                            </div>
                            <div class="subject flex-col">
                                <span>Message</span>
                                <p>Description</p>
                            </div>
                            <div class="count flex-cen">05</div>
                        </div>
                    </div>

                    <div class="board-container mt-20">
                        <app-student-class-board
                            [classes]="classes()"
                            [currentValue]="currentValue"
                            [maxValue]="maxValue">
                        </app-student-class-board>

                        <app-student-schedule-board
                            [sessions]="sessions()"
                            [joiningSessionId]="joiningSessionId()"
                            (joinSession)="joinSession($event)">
                        </app-student-schedule-board>
                    </div>

                    <div class="label flex-betw mt-20">
                        <span>Your Bookings</span>
                        <div class="flex-cen" style="gap: 10px; cursor: pointer;" (click)="navigateToBooking()"> 
                            <span>More</span>
                            <mat-icon>arrow_right_alt</mat-icon>
                        </div>
                    </div>
                    <div class="booking mt-20 flex-cen" style="gap: 20px; padding: 0;">
                        <!-- Booking Card 1 -->
                        <div style="flex: 1; background-color: white; border-radius: 10px; padding: 15px; box-sizing: border-box; display: flex; flex-direction: column; gap: 12px;">
                            <div class="flex-cen" style="gap: 12px;">
                                <img src="default-avatar.jpg" alt="avatar" style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover;">
                                <div class="flex-col" style="gap: 4px; flex: 1;">
                                    <span style="font-size: 12px; font-weight: 500;">Nguyễn Văn Minh</span>
                                    <p style="font-size: 10px; color: #acacacff; margin: 0;">Teacher</p>
                                </div>
                                <div style="background-color: #6b46c1; padding: 4px 8px; border-radius: 4px;" class="flex-cen">
                                    <span style="font-size: 9px; color: white; font-weight: 500;">Active</span>
                                </div>
                            </div>
                            <div style="border-bottom: 1px solid #f1f1f1;"></div>
                            <div class="flex-col" style="gap: 8px;">
                                <div class="flex-betw">
                                    <span style="font-size: 11px; color: #acacacff;">Subject:</span>
                                    <span style="font-size: 11px; font-weight: 500;">Mathematics</span>
                                </div>
                                <div class="flex-betw">
                                    <span style="font-size: 11px; color: #acacacff;">Session:</span>
                                    <span style="font-size: 11px; font-weight: 500;">2h/week</span>
                                </div>
                                <div class="flex-betw">
                                    <span style="font-size: 11px; color: #acacacff;">Next class:</span>
                                    <span style="font-size: 11px; font-weight: 500;">Today 3PM</span>
                                </div>
                            </div>
                            <button style="background-color: #6b46c1; color: white; border: none; border-radius: 5px; padding: 8px; font-size: 11px; font-weight: 500; cursor: pointer; transition: all 0.3s ease;">View Details</button>
                        </div>

                        <!-- Booking Card 2 -->
                        <div style="flex: 1; background-color: white; border-radius: 10px; padding: 15px; box-sizing: border-box; display: flex; flex-direction: column; gap: 12px;">
                            <div class="flex-cen" style="gap: 12px;">
                                <img src="default-avatar.jpg" alt="avatar" style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover;">
                                <div class="flex-col" style="gap: 4px; flex: 1;">
                                    <span style="font-size: 12px; font-weight: 500;">Trần Thị Hương</span>
                                    <p style="font-size: 10px; color: #acacacff; margin: 0;">Tutor</p>
                                </div>
                                <div style="background-color: #7e72bdff; padding: 4px 8px; border-radius: 4px;" class="flex-cen">
                                    <span style="font-size: 9px; color: white; font-weight: 500;">Pending</span>
                                </div>
                            </div>
                            <div style="border-bottom: 1px solid #f1f1f1;"></div>
                            <div class="flex-col" style="gap: 8px;">
                                <div class="flex-betw">
                                    <span style="font-size: 11px; color: #acacacff;">Subject:</span>
                                    <span style="font-size: 11px; font-weight: 500;">Physics</span>
                                </div>
                                <div class="flex-betw">
                                    <span style="font-size: 11px; color: #acacacff;">Session:</span>
                                    <span style="font-size: 11px; font-weight: 500;">1.5h/week</span>
                                </div>
                                <div class="flex-betw">
                                    <span style="font-size: 11px; color: #acacacff;">Start date:</span>
                                    <span style="font-size: 11px; font-weight: 500;">Jan 20, 2026</span>
                                </div>
                            </div>
                            <button style="background-color: #7e72bdff; color: white; border: none; border-radius: 5px; padding: 8px; font-size: 11px; font-weight: 500; cursor: pointer; transition: all 0.3s ease;">View Details</button>
                        </div>

                        <!-- Booking Card 3 -->
                        <div style="flex: 1; background-color: white; border-radius: 10px; padding: 15px; box-sizing: border-box; display: flex; flex-direction: column; gap: 12px;">
                            <div class="flex-cen" style="gap: 12px;">
                                <img src="default-avatar.jpg" alt="avatar" style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover;">
                                <div class="flex-col" style="gap: 4px; flex: 1;">
                                    <span style="font-size: 12px; font-weight: 500;">Lê Văn Hải</span>
                                    <p style="font-size: 10px; color: #acacacff; margin: 0;">Teacher</p>
                                </div>
                                <div style="background-color: #3432c0ff; padding: 4px 8px; border-radius: 4px;" class="flex-cen">
                                    <span style="font-size: 9px; color: white; font-weight: 500;">Completed</span>
                                </div>
                            </div>
                            <div style="border-bottom: 1px solid #f1f1f1;"></div>
                            <div class="flex-col" style="gap: 8px;">
                                <div class="flex-betw">
                                    <span style="font-size: 11px; color: #acacacff;">Subject:</span>
                                    <span style="font-size: 11px; font-weight: 500;">Chemistry</span>
                                </div>
                                <div class="flex-betw">
                                    <span style="font-size: 11px; color: #acacacff;">Session:</span>
                                    <span style="font-size: 11px; font-weight: 500;">2h/week</span>
                                </div>
                                <div class="flex-betw">
                                    <span style="font-size: 11px; color: #acacacff;">Ended:</span>
                                    <span style="font-size: 11px; font-weight: 500;">Dec 31, 2025</span>
                                </div>
                            </div>
                            <button style="background-color: #3432c0ff; color: white; border: none; border-radius: 5px; padding: 8px; font-size: 11px; font-weight: 500; cursor: pointer; transition: all 0.3s ease;">Ended</button>
                        </div>
                    </div>
                </div>
            }
            <app-user-info></app-user-info>
        </div>
    `
})
export class Dashboard implements OnInit {
    private classListStore = inject(ClassListStore);
    private sessionListStore = inject(SessionListStore);
    private roomsService = inject(RoomsService);
    private bookingsService = inject(BookingsService);
    private teachersService = inject(TeachersService);
    private router = inject(Router);
    private userService = inject(UserService);

    classes = this.classListStore.classes;
    sessions = this.sessionListStore.sessions;
    roomCodeBySession = signal<Record<number, string>>({});
    selectedRoomCode = signal<string>('');
    joiningSessionId = signal<number | null>(null);
    bookedTutorCards = signal<BookedTutorCard[]>([]);

    user = this.userService.user;

    setClass: string = '';

    today = new Date();

    currentValue = 30;
    maxValue = 100;

    ngOnInit(): void {
        this.classListStore.loadClassList();
        this.sessionListStore.loadSessionList();
        if (this.user().role === 'student') {
            this.loadBookedTutors();
        }
    }

    private loadBookedTutors(): void {
        forkJoin({
            bookings: this.bookingsService.bookingsList().pipe(catchError(() => of([]))),
            tutors: this.teachersService.teachersTutorsList().pipe(catchError(() => of([]))),
        }).subscribe(({ bookings, tutors }) => {
            const bookedTutorMap = new Map<number, BookedTutorCard>();

            for (const booking of bookings) {
                const tutor = booking.teacher;
                if (!bookedTutorMap.has(tutor.id)) {
                    const nextSlot = booking.time_slot
                        ? new Intl.DateTimeFormat('vi-VN', {
                            day: '2-digit', month: '2-digit', year: 'numeric',
                            hour: '2-digit', minute: '2-digit',
                          }).format(new Date(booking.time_slot.start_at))
                        : null;
                    bookedTutorMap.set(tutor.id, {
                        tutor,
                        status: booking.status ?? 'pending',
                        nextSlot,
                        isBooked: true,
                    });
                }
                if (bookedTutorMap.size >= 3) break;
            }

            const cards: BookedTutorCard[] = Array.from(bookedTutorMap.values());

            if (cards.length < 3) {
                const bookedIds = new Set(bookedTutorMap.keys());
                const remaining = tutors.filter(t => !bookedIds.has(t.id));
                const shuffled = remaining.sort(() => Math.random() - 0.5);
                for (const tutor of shuffled) {
                    if (cards.length >= 3) break;
                    cards.push({ tutor, status: '', nextSlot: null, isBooked: false });
                }
            }

            this.bookedTutorCards.set(cards);
        });
    }

    getBookingStatusColor(status: string): string {
        switch (status) {
            case 'confirmed': return '#6b46c1';
            case 'pending': return '#7e72bdff';
            case 'cancelled': return '#bb295fff';
            default: return '#3432c0ff';
        }
    }

    getBookingStatusLabel(status: string): string {
        switch (status) {
            case 'confirmed': return 'Confirmed';
            case 'pending': return 'Pending';
            case 'cancelled': return 'Cancelled';
            default: return status;
        }
    }

    private toLocalDateKey(dateValue: string | Date): string {
        const date = new Date(dateValue);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');

        return `${year}-${month}-${day}`;
    }

    getSessionJoinState(session: SessionDetail): SessionJoinState {
        if (session.status === 'finished' || session.status === 'cancelled') {
            return 'finished';
        }

        const todayKey = this.toLocalDateKey(new Date());
        const startDateKey = this.toLocalDateKey(session.start_at);

        if (todayKey === startDateKey) {
            return 'ongoing';
        }

        if (todayKey < startDateKey) {
            return 'upcoming';
        }

        return 'finished';
    }

    isSessionJoinable(session: SessionDetail): boolean {
        return this.getSessionJoinState(session) === 'ongoing';
    }

    async joinSession(session: SessionDetail): Promise<void> {
        if (!this.isSessionJoinable(session)) {
            return;
        }

        const sessionId = Number(session.id);

        if (!sessionId || Number.isNaN(sessionId)) {
            console.error('Invalid session id for join action:', session.id);
            return;
        }

        if (this.joiningSessionId() === sessionId) {
            return;
        }

        this.joiningSessionId.set(sessionId);

        try {
            let roomCode = this.roomCodeBySession()[sessionId];

            if (!roomCode) {
                const room = await firstValueFrom(
                    this.roomsService.roomsBySessionRetrieve(sessionId)
                );
                roomCode = room.room_code;

                if (!roomCode) {
                    throw new Error(`Room code is missing for session ${sessionId}`);
                }

                this.roomCodeBySession.update(cache => ({
                    ...cache,
                    [sessionId]: roomCode
                }));
            }

            this.selectedRoomCode.set(roomCode);

            this.router.navigate(['/video-call', this.selectedRoomCode()], {
                queryParams: { sessionId }
            });
        } catch (error) {
            console.error(`Failed to get room by session ${sessionId}:`, error);
        } finally {
            this.joiningSessionId.set(null);
        }
    }

    navigateToBooking() {
        this.router.navigate(['/booking']);
    }

}