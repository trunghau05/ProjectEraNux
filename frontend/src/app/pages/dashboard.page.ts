import { CommonModule } from "@angular/common";
import { Component, computed, inject, OnInit, signal } from "@angular/core";
import { UserInfo } from "../components/features/user-info/user-info.component";
import { MatIconModule } from "@angular/material/icon";
import { BookedTimeSlot, BookingsService, RoomsService, SessionDetail, Teacher, TeachersService, TutorBookedStudent } from "../apis";
import { Router } from "@angular/router";
import { firstValueFrom, forkJoin, of } from "rxjs";
import { catchError } from "rxjs/operators";
import { ClassBoardComponent } from "../components/features/class-board/class-board.component";
import { ScheduleBoardComponent } from "../components/features/schedule-board/schedule-board.component";
import { TutorBoardComponent } from "../components/features/tutor-board/tutor-board.component";
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

type TutorDashboardBookingCard = {
    student: TutorBookedStudent['student'];
    pendingCount: number;
    confirmedCount: number;
    latestSlot: BookedTimeSlot | null;
};

@Component({
    selector: 'app-dashboard',
    imports: [CommonModule, UserInfo, MatIconModule, ClassBoardComponent, ScheduleBoardComponent, TutorBoardComponent],
    template: `
        <style>
            :host {
                display: block;
                height: 100vh;
                overflow-y: auto;
                overflow-x: hidden;
                scrollbar-width: thin;
                scrollbar-color: #6b46c1 #f1f1f1;
            }
            .box { display: flex; align-items: flex-start; width: 100%; min-height: 100vh; }
            .center {
                flex: 1;
                padding: 30px;
                min-height: 100vh;
                box-sizing: border-box;
                overflow: visible;
            }
            .title { font-size: 14px; font-weight: 500; }
            app-user-info { flex: 0 0 260px; height: 100vh; overflow: hidden; position: sticky; top: 0; align-self: flex-start; }
            .ic { padding: 5px; background-color: #6b46c1; border-radius: 5px; cursor: pointer; }
            .ic mat-icon { height: 15px; width: 15px; font-size: 15px; color: white; }
            .card-container { gap: 20px; width: 100%; }
            .card-item { background-color: white; border-radius: 10px; padding: 15px; gap: 10px; flex: 1; }
            .count { color: black; font-size: 12px; height: 20px; width: 20px; text-align: center; font-weight: 500; }
            .subject { color: black; flex: 1; }
            .subject span { font-size: 12px; font-weight: 500; }
            .subject p { font-size: 10px; margin: 0; }
            .icon { color: white; border-radius: 8px; padding: 10px; background-color: #7f54e4ff; mat-icon { height: 15px; width: 15px; font-size: 15px; } }
            .board-container { display: flex; justify-content: center; width: 100%; gap: 20px; }
            .label span { font-size: 12px; font-weight: 500; }
            .label mat-icon { height: 15px; width: 15px; font-size: 15px; }
            :host::-webkit-scrollbar { width: 10px; }
            :host::-webkit-scrollbar-track { background: #f1f1f1; border-radius: 10px; }
            :host::-webkit-scrollbar-thumb {
                background: #6b46c1;
                border-radius: 10px;
                border: 2px solid transparent;
                background-clip: padding-box;
            }
            :host::-webkit-scrollbar-thumb:hover { background: #5a3bb0; }
            app-user-info::-webkit-scrollbar { display: none; width: 0; height: 0; }
            app-user-info { scrollbar-width: none; }
            .booking { width: 100%; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 20px; align-items: stretch; }
            .booking-card { min-width: 0; width: 100%; background-color: white; border-radius: 10px; padding: 12px; box-sizing: border-box; display: flex; flex-direction: column; gap: 10px; }
            .state-box { grid-column: 1 / -1; margin-top: 0; padding: 12px 16px; border-radius: 8px; background: white; display: flex; flex-direction: column; gap: 4px; }
            .state-title { font-size: 12px; font-weight: 500; color: #5a5a6e; }
            .state-text { font-size: 11px; color: #9a9ab0; }
            app-schedule-board { width: 55%; }
            app-class-board { width: 45%; }
            app-tutor-board { width: 45%; }

            @media (max-width: 1200px) {
                .booking { grid-template-columns: repeat(2, minmax(0, 1fr)); }
            }

            @media (max-width: 768px) {
                .booking { grid-template-columns: 1fr; }
            }
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
                        <app-class-board
                            [classes]="classBoardClasses()"
                            [sessions]="sessions()"
                            [role]="user().role">
                        </app-class-board>

                        <app-schedule-board
                            [joiningSessionId]="joiningSessionId()"
                            (joinSession)="joinSession($event)">
                        </app-schedule-board>
                    </div>

                    <div class="label flex-betw mt-20">
                        <span>Your Bookings</span>
                        <div class="flex-cen" style="gap: 10px; cursor: pointer;" (click)="navigateToBooking()"> 
                            <span>More</span>
                            <mat-icon>arrow_right_alt</mat-icon>
                        </div>
                    </div>
                    <div class="booking mt-20" style="padding: 0;">
                        @for (card of bookedTutorCards(); track card.tutor.id) {
                        <div class="booking-card">
                            <div class="flex-cen" style="gap: 12px;">
                                <img [src]="card.tutor.img || 'default-avatar.jpg'" alt="avatar" style="width: 44px; height: 44px; border-radius: 50%; object-fit: cover;">
                                <div class="flex-col" style="gap: 4px; flex: 1;">
                                    <span style="font-size: 11px; font-weight: 500;">{{ card.tutor.name }}</span>
                                    <p style="font-size: 9px; color: #acacacff; margin: 0;">{{ card.tutor.role === 'tutor' ? 'Tutor' : 'Teacher' }}</p>
                                </div>
                                @if (card.isBooked) {
                                <div [ngStyle]="{'background-color': getBookingStatusColor(card.status)}" style="padding: 4px 8px; border-radius: 4px;" class="flex-cen">
                                    <span style="font-size: 8px; color: white; font-weight: 500;">{{ getBookingStatusLabel(card.status) }}</span>
                                </div>
                                }
                            </div>
                            <div style="border-bottom: 1px solid #f1f1f1;"></div>
                            <div class="flex-col" style="gap: 8px;">
                                <div class="flex-betw">
                                    <span style="font-size: 10px; color: #acacacff;">Email:</span>
                                    <span style="font-size: 10px; font-weight: 500;">{{ card.tutor.email }}</span>
                                </div>
                                @if (card.tutor.rating) {
                                <div class="flex-betw">
                                    <span style="font-size: 10px; color: #acacacff;">Rating:</span>
                                    <span style="font-size: 10px; font-weight: 500;">{{ card.tutor.rating }}/5</span>
                                </div>
                                }
                                <div class="flex-betw">
                                    <span style="font-size: 10px; color: #acacacff;">{{ card.isBooked ? 'Next Session:' : 'Status:' }}</span>
                                    <span style="font-size: 10px; font-weight: 500;">{{ card.isBooked ? (card.nextSlot || 'No upcoming') : 'Not booked' }}</span>
                                </div>
                            </div>
                            <button [ngStyle]="{'background-color': card.isBooked ? getBookingStatusColor(card.status) : '#6b46c1'}" style="color: white; border: none; border-radius: 5px; padding: 7px; font-size: 10px; font-weight: 500; cursor: pointer; transition: all 0.3s ease;" (click)="navigateToBooking()">{{ card.isBooked ? 'View Details' : 'Book Session' }}</button>
                        </div>
                        }
                    </div>
                </div>
            }
    
            @if (user().role === 'teacher') {
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
                        <app-class-board
                            [classes]="classBoardClasses()"
                            [sessions]="sessions()"
                            [role]="user().role">
                        </app-class-board>

                        <app-schedule-board
                            [joiningSessionId]="joiningSessionId()"
                            (joinSession)="joinSession($event)">
                        </app-schedule-board>
                    </div>

                    <div class="label flex-betw mt-20">
                        <span>Your Bookings</span>
                        <div class="flex-cen" style="gap: 10px; cursor: pointer;" (click)="navigateToBooking()"> 
                            <span>More</span>
                            <mat-icon>arrow_right_alt</mat-icon>
                        </div>
                    </div>
                    <div class="booking mt-20" style="padding: 0;">
                        <!-- Booking Card 1 -->
                        <div class="booking-card">
                            <div class="flex-cen" style="gap: 12px;">
                                <img src="default-avatar.jpg" alt="avatar" style="width: 44px; height: 44px; border-radius: 50%; object-fit: cover;">
                                <div class="flex-col" style="gap: 4px; flex: 1;">
                                    <span style="font-size: 11px; font-weight: 500;">Nguyễn Văn Minh</span>
                                    <p style="font-size: 9px; color: #acacacff; margin: 0;">Teacher</p>
                                </div>
                                <div style="background-color: #6b46c1; padding: 4px 8px; border-radius: 4px;" class="flex-cen">
                                    <span style="font-size: 8px; color: white; font-weight: 500;">Active</span>
                                </div>
                            </div>
                            <div style="border-bottom: 1px solid #f1f1f1;"></div>
                            <div class="flex-col" style="gap: 8px;">
                                <div class="flex-betw">
                                    <span style="font-size: 10px; color: #acacacff;">Subject:</span>
                                    <span style="font-size: 10px; font-weight: 500;">Mathematics</span>
                                </div>
                                <div class="flex-betw">
                                    <span style="font-size: 10px; color: #acacacff;">Session:</span>
                                    <span style="font-size: 10px; font-weight: 500;">2h/week</span>
                                </div>
                                <div class="flex-betw">
                                    <span style="font-size: 10px; color: #acacacff;">Next class:</span>
                                    <span style="font-size: 10px; font-weight: 500;">Today 3PM</span>
                                </div>
                            </div>
                            <button style="background-color: #6b46c1; color: white; border: none; border-radius: 5px; padding: 7px; font-size: 10px; font-weight: 500; cursor: pointer; transition: all 0.3s ease;">View Details</button>
                        </div>

                        <!-- Booking Card 2 -->
                        <div class="booking-card">
                            <div class="flex-cen" style="gap: 12px;">
                                <img src="default-avatar.jpg" alt="avatar" style="width: 44px; height: 44px; border-radius: 50%; object-fit: cover;">
                                <div class="flex-col" style="gap: 4px; flex: 1;">
                                    <span style="font-size: 11px; font-weight: 500;">Trần Thị Hương</span>
                                    <p style="font-size: 9px; color: #acacacff; margin: 0;">Tutor</p>
                                </div>
                                <div style="background-color: #7e72bdff; padding: 4px 8px; border-radius: 4px;" class="flex-cen">
                                    <span style="font-size: 8px; color: white; font-weight: 500;">Pending</span>
                                </div>
                            </div>
                            <div style="border-bottom: 1px solid #f1f1f1;"></div>
                            <div class="flex-col" style="gap: 8px;">
                                <div class="flex-betw">
                                    <span style="font-size: 10px; color: #acacacff;">Subject:</span>
                                    <span style="font-size: 10px; font-weight: 500;">Physics</span>
                                </div>
                                <div class="flex-betw">
                                    <span style="font-size: 10px; color: #acacacff;">Session:</span>
                                    <span style="font-size: 10px; font-weight: 500;">1.5h/week</span>
                                </div>
                                <div class="flex-betw">
                                    <span style="font-size: 10px; color: #acacacff;">Start date:</span>
                                    <span style="font-size: 10px; font-weight: 500;">Jan 20, 2026</span>
                                </div>
                            </div>
                            <button style="background-color: #7e72bdff; color: white; border: none; border-radius: 5px; padding: 7px; font-size: 10px; font-weight: 500; cursor: pointer; transition: all 0.3s ease;">View Details</button>
                        </div>

                        <!-- Booking Card 3 -->
                        <div class="booking-card">
                            <div class="flex-cen" style="gap: 12px;">
                                <img src="default-avatar.jpg" alt="avatar" style="width: 44px; height: 44px; border-radius: 50%; object-fit: cover;">
                                <div class="flex-col" style="gap: 4px; flex: 1;">
                                    <span style="font-size: 11px; font-weight: 500;">Lê Văn Hải</span>
                                    <p style="font-size: 9px; color: #acacacff; margin: 0;">Teacher</p>
                                </div>
                                <div style="background-color: #3432c0ff; padding: 4px 8px; border-radius: 4px;" class="flex-cen">
                                    <span style="font-size: 8px; color: white; font-weight: 500;">Completed</span>
                                </div>
                            </div>
                            <div style="border-bottom: 1px solid #f1f1f1;"></div>
                            <div class="flex-col" style="gap: 8px;">
                                <div class="flex-betw">
                                    <span style="font-size: 10px; color: #acacacff;">Subject:</span>
                                    <span style="font-size: 10px; font-weight: 500;">Chemistry</span>
                                </div>
                                <div class="flex-betw">
                                    <span style="font-size: 10px; color: #acacacff;">Session:</span>
                                    <span style="font-size: 10px; font-weight: 500;">2h/week</span>
                                </div>
                                <div class="flex-betw">
                                    <span style="font-size: 10px; color: #acacacff;">Ended:</span>
                                    <span style="font-size: 10px; font-weight: 500;">Dec 31, 2025</span>
                                </div>
                            </div>
                            <button style="background-color: #3432c0ff; color: white; border: none; border-radius: 5px; padding: 7px; font-size: 10px; font-weight: 500; cursor: pointer; transition: all 0.3s ease;">Ended</button>
                        </div>
                    </div>
                </div>
            }

            @if (user().role === 'tutor') {
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
                                <mat-icon>groups</mat-icon>
                            </div>
                            <div class="subject flex-col">
                                <span>Students</span>
                                <p>Description</p>
                            </div>
                            <div class="count flex-cen">{{ tutorBookingCards().length }}</div>
                        </div>

                        <div class="card-item flex-cen" style="background-color: white;">
                            <div class="icon flex-cen" style="background-color: #514fe3ff;">
                                <mat-icon>event</mat-icon>
                            </div>
                            <div class="subject flex-col">
                                <span>Session</span>
                                <p>Description</p>
                            </div>
                            <div class="count flex-cen">{{ sessions().length }}</div>
                        </div>

                        <div class="card-item flex-cen" style="background-color: white;">
                            <div class="icon flex-cen" style="background-color: #bb295fff;">
                                <mat-icon>check_circle</mat-icon>
                            </div>
                            <div class="subject flex-col">
                                <span>Booked</span>
                                <p>Description</p>
                            </div>
                            <div class="count flex-cen">{{ tutorConfirmedBookingCount() }}</div>
                        </div>
                    </div>

                    <div class="board-container mt-20">
                        <app-tutor-board
                            [bookedStudents]="tutorBookedStudents()"
                            [sessions]="sessions()">
                        </app-tutor-board>

                        <app-schedule-board
                            [joiningSessionId]="joiningSessionId()"
                            (joinSession)="joinSession($event)">
                        </app-schedule-board>
                    </div>

                    <div class="label flex-betw mt-20">
                        <span>Your Bookings</span>
                        <div class="flex-cen" style="gap: 10px; cursor: pointer;" (click)="navigateToBooking()">
                            <span>More</span>
                            <mat-icon>arrow_right_alt</mat-icon>
                        </div>
                    </div>

                    <div class="booking mt-20" style="padding: 0;">
                        @if (tutorBookingCards().length === 0) {
                            <div class="state-box">
                                <span class="state-title">No pending or confirmed student bookings yet.</span>
                                <span class="state-text">Students who book your time slots will appear here.</span>
                            </div>
                        }

                        @for (card of tutorBookingCards(); track card.student.id) {
                            <div class="booking-card">
                                <div class="flex-cen" style="gap: 12px;">
                                    <img [src]="card.student.img || 'default-avatar.jpg'" alt="avatar" style="width: 44px; height: 44px; border-radius: 50%; object-fit: cover;">
                                    <div class="flex-col" style="gap: 4px; flex: 1;">
                                        <span style="font-size: 11px; font-weight: 500;">{{ card.student.name }}</span>
                                        <p style="font-size: 9px; color: #acacacff; margin: 0;">Student</p>
                                    </div>
                                    <div
                                        [ngStyle]="{'background-color': card.pendingCount > 0 ? getBookingStatusColor('pending') : getBookingStatusColor('confirmed')}"
                                        style="padding: 4px 8px; border-radius: 4px;"
                                        class="flex-cen">
                                        <span style="font-size: 8px; color: white; font-weight: 500;">
                                            {{ card.pendingCount > 0 ? 'Booking' : 'Booked' }}
                                        </span>
                                    </div>
                                </div>

                                <div style="border-bottom: 1px solid #f1f1f1;"></div>

                                <div class="flex-col" style="gap: 8px;">
                                    <div class="flex-betw">
                                        <span style="font-size: 10px; color: #acacacff;">Email:</span>
                                        <span style="font-size: 10px; font-weight: 500;">{{ card.student.email }}</span>
                                    </div>
                                    <div class="flex-betw">
                                        <span style="font-size: 10px; color: #acacacff;">Booking:</span>
                                        <span style="font-size: 10px; font-weight: 500;">{{ card.pendingCount }}</span>
                                    </div>
                                    <div class="flex-betw">
                                        <span style="font-size: 10px; color: #acacacff;">Booked:</span>
                                        <span style="font-size: 10px; font-weight: 500;">{{ card.confirmedCount }}</span>
                                    </div>
                                    <div class="flex-betw">
                                        <span style="font-size: 10px; color: #acacacff;">Latest slot:</span>
                                        <span style="font-size: 10px; font-weight: 500;">{{ formatTutorLatestSlot(card.latestSlot) }}</span>
                                    </div>
                                </div>

                                <button
                                    [ngStyle]="{'background-color': card.pendingCount > 0 ? getBookingStatusColor('pending') : getBookingStatusColor('confirmed')}"
                                    style="color: white; border: none; border-radius: 5px; padding: 7px; font-size: 10px; font-weight: 500; cursor: pointer; transition: all 0.3s ease;"
                                    (click)="navigateToBooking()">
                                    View Bookings
                                </button>
                            </div>
                        }
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
    enrolledClasses = this.classListStore.enrolledClasses;
    teacherClasses = this.classListStore.teacherClasses;
    sessions = this.sessionListStore.sessions;
    roomCodeBySession = signal<Record<number, string>>({});
    selectedRoomCode = signal<string>('');
    joiningSessionId = signal<number | null>(null);
    bookedTutorCards = signal<BookedTutorCard[]>([]);
    tutorBookedStudents = signal<TutorBookedStudent[]>([]);

    tutorBookingCards = computed<TutorDashboardBookingCard[]>(() => {
        return this.tutorBookedStudents()
            .map((item) => {
                const pendingCount = item.time_slots.filter((slot) => slot.booking_status === 'pending').length;
                const confirmedCount = item.time_slots.filter((slot) => slot.booking_status === 'confirmed').length;
                const latestSlot = item.time_slots.length > 0
                    ? [...item.time_slots].sort((a, b) => new Date(b.start_at).getTime() - new Date(a.start_at).getTime())[0]
                    : null;

                return {
                    student: item.student,
                    pendingCount,
                    confirmedCount,
                    latestSlot,
                };
            })
            .filter((item) => item.pendingCount > 0 || item.confirmedCount > 0)
            .sort((a, b) => {
                const aTime = a.latestSlot ? new Date(a.latestSlot.start_at).getTime() : 0;
                const bTime = b.latestSlot ? new Date(b.latestSlot.start_at).getTime() : 0;
                return bTime - aTime;
            })
            .slice(0, 6);
    });

    tutorConfirmedBookingCount = computed(() =>
        this.tutorBookedStudents().reduce((total, item) => {
            return total + item.time_slots.filter((slot) => slot.booking_status === 'confirmed').length;
        }, 0)
    );

    user = this.userService.user;

    classBoardClasses = computed(() => {
        const role = this.user().role;
        if (role === 'student') {
            return this.enrolledClasses();
        }

        if (role === 'teacher') {
            return this.teacherClasses();
        }

        return [];
    });

    setClass: string = '';

    today = new Date();

    ngOnInit(): void {
        // Kick off class and session list loads on page init
        this.classListStore.loadClassList();
        this.sessionListStore.loadSessionList();
        // Only students have the booking cards section on the dashboard
        if (this.user().role === 'student') {
            this.loadBookedTutors();
        }

        if (this.user().role === 'tutor') {
            this.loadTutorBookedStudents();
        }
    }

    private loadTutorBookedStudents(): void {
        const currentUser = this.user();

        if (!currentUser?.id) {
            this.tutorBookedStudents.set([]);
            return;
        }

        this.bookingsService.bookingsTutorStudentsList(currentUser.id)
            .pipe(catchError(() => of([] as TutorBookedStudent[])))
            .subscribe((students) => {
                this.tutorBookedStudents.set(students);
            });
    }

    private loadBookedTutors(): void {
        // Fetch both the student's bookings and the full tutor list in parallel
        forkJoin({
            bookings: this.bookingsService.bookingsList().pipe(catchError(() => of([]))),
            tutors: this.teachersService.teachersTutorsList().pipe(catchError(() => of([]))),
        }).subscribe(({ bookings, tutors }) => {
            const bookedTutorMap = new Map<number, BookedTutorCard>();

            // Build a map of tutor cards from confirmed/pending bookings (max 3 unique tutors)
            for (const booking of bookings) {
                const tutor = booking.teacher;
                if (!bookedTutorMap.has(tutor.id)) {
                    // Format the next time slot start as a localized date-time string
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

            // If fewer than 3 booked tutors, fill the rest with unbooked tutors (shuffled)
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
        // Return a brand color for the booking status badge
        switch (status) {
            case 'confirmed': return '#6b46c1';
            case 'pending': return '#7e72bdff';
            case 'cancelled': return '#bb295fff';
            default: return '#3432c0ff';
        }
    }

    getBookingStatusLabel(status: string): string {
        // Return a human-readable label for the booking status
        switch (status) {
            case 'confirmed': return 'Confirmed';
            case 'pending': return 'Pending';
            case 'cancelled': return 'Cancelled';
            default: return status;
        }
    }

    formatTutorLatestSlot(slot: BookedTimeSlot | null): string {
        if (!slot) {
            return 'No slot';
        }

        return new Intl.DateTimeFormat('vi-VN', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
        }).format(new Date(slot.start_at));
    }

    private toLocalDateKey(dateValue: string | Date): string {
        // Format a date as YYYY-MM-DD using local time (avoids UTC midnight shifting)
        const date = new Date(dateValue);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');

        return `${year}-${month}-${day}`;
    }

    getSessionJoinState(session: SessionDetail): SessionJoinState {
        // Finished or cancelled sessions are never joinable
        if (session.status === 'finished' || session.status === 'cancelled') {
            return 'finished';
        }

        const todayKey = this.toLocalDateKey(new Date());
        const startDateKey = this.toLocalDateKey(session.start_at);

        // Session starts today → treat as ongoing
        if (todayKey === startDateKey) {
            return 'ongoing';
        }

        // Session starts in the future
        if (todayKey < startDateKey) {
            return 'upcoming';
        }

        // Session start date is in the past
        return 'finished';
    }

    isSessionJoinable(session: SessionDetail): boolean {
        // Only sessions classified as ongoing can be entered
        return this.getSessionJoinState(session) === 'ongoing';
    }

    async joinSession(session: SessionDetail): Promise<void> {
        // Guard: only ongoing sessions can be joined
        if (!this.isSessionJoinable(session)) {
            return;
        }

        const sessionId = Number(session.id);

        // Guard: validate the session ID before proceeding
        if (!sessionId || Number.isNaN(sessionId)) {
            console.error('Invalid session id for join action:', session.id);
            return;
        }

        // Guard: prevent a second join attempt while one is already in progress
        if (this.joiningSessionId() === sessionId) {
            return;
        }

        this.joiningSessionId.set(sessionId);

        try {
            // Re-use the cached room code if available; otherwise fetch from the API
            let roomCode = this.roomCodeBySession()[sessionId];

            if (!roomCode) {
                const room = await firstValueFrom(
                    this.roomsService.roomsBySessionRetrieve(sessionId)
                );
                roomCode = room.room_code;

                if (!roomCode) {
                    throw new Error(`Room code is missing for session ${sessionId}`);
                }

                // Cache the room code to avoid repeated lookups
                this.roomCodeBySession.update(cache => ({
                    ...cache,
                    [sessionId]: roomCode
                }));
            }

            this.selectedRoomCode.set(roomCode);

            // Navigate to the video-call route, passing the session ID as a query param
            this.router.navigate(['/video-call', this.selectedRoomCode()], {
                queryParams: { sessionId }
            });
        } catch (error) {
            console.error(`Failed to get room by session ${sessionId}:`, error);
        } finally {
            // Always clear the joining indicator regardless of outcome
            this.joiningSessionId.set(null);
        }
    }

    navigateToBooking() {
        // Navigate to the booking page
        this.router.navigate(['/booking']);
    }

}