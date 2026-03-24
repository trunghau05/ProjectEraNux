import { CommonModule } from "@angular/common";
import { Component, inject, OnInit, signal } from "@angular/core";
import { UserInfo } from "../components/features/user-info/user-info.component";
import { MatIconModule } from "@angular/material/icon";
import { Chart, registerables  } from "chart.js";
import { RoomsService, SessionDetail } from "../apis";
import { Router } from "@angular/router";
import { firstValueFrom } from "rxjs";
import { StudentClassBoardComponent } from "../components/features/student/class-board/class-board.component";
import { StudentScheduleBoardComponent } from "../components/features/student/schedule-board/schedule-board.component";
import { UserService } from "../services/user.service";
import { ClassListStore } from "../stores/class.store";
import { SessionListStore } from "../stores/session.store";

type SessionJoinState = 'ongoing' | 'upcoming' | 'finished';

@Component({
    selector: 'app-dashboard',
    imports: [CommonModule, UserInfo, MatIconModule, StudentClassBoardComponent, StudentScheduleBoardComponent],
    template: `
        <style>
            .box { display: flex; align-items: flex-start; width: 100%; height: 100vh; overflow: hidden; }
            .center { flex: 1; padding: 30px; height: 100vh; box-sizing: border-box; overflow: auto; scrollbar-width: thin; }
            .title { font-size: 14px; font-weight: 500; }
            app-user-info { flex: 0 0 260px; height: 100vh; overflow: auto; position: sticky; top: 0; align-self: flex-start; }
            .ic { padding: 5px; background-color: #6b46c1; border-radius: 5px; cursor: pointer; }
            .ic mat-icon { height: 15px; width: 15px; font-size: 15px; color: white; }
            .chart { border-radius: 10px; position: relative; overflow: hidden; height: 230px; width: 100%; padding: 20px; background-color: white; box-sizing: border-box; }
            .chart canvas { width: 100% !important; height: 100% !important; }
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
            .center::-webkit-scrollbar, app-user-info::-webkit-scrollbar { width: 10px; height: 10px; }
            .center::-webkit-scrollbar-track, app-user-info::-webkit-scrollbar-track { background: #f1f1f1; border-radius: 10px; }
            .center::-webkit-scrollbar-thumb, app-user-info::-webkit-scrollbar-thumb { background: #6b46c1; border-radius: 10px; border: 2px solid transparent; background-clip: padding-box; }
            .center::-webkit-scrollbar-button, app-user-info::-webkit-scrollbar-button { display: none; width: 0; height: 0; }
            .center, app-user-info { scrollbar-width: thin; scrollbar-color: #6b46c1 #f1f1f1; }
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
                            <div class="ic flex-cen">
                                <mat-icon>search</mat-icon>
                            </div>
                        </div>
                    </div>

                    <div class="chart mt-20">
                        <canvas id="dashboardLineChart"></canvas>
                    </div>

                    <div class="label flex-betw mt-20">
                        <span>Your Cources</span>
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

                    <div class="chart mt-20">
                        <canvas id="dashboardLineChart"></canvas>
                    </div>

                    <div class="label flex-betw mt-20">
                        <span>Your Cources</span>
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
    private router = inject(Router);
    private userService = inject(UserService);

    classes = this.classListStore.classes;
    sessions = this.sessionListStore.sessions;
    roomCodeBySession = signal<Record<number, string>>({});
    selectedRoomCode = signal<string>('');
    joiningSessionId = signal<number | null>(null);

    user = this.userService.user;

    setClass: string = '';

    today = new Date();
    chart!: Chart;

    currentValue = 30;
    maxValue = 100;

    ngOnInit(): void {
        this.classListStore.loadClassList();
        this.sessionListStore.loadSessionList();

        Chart.register(...registerables);
        setTimeout(() => {
            this.initLineChart();
        });
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

    initLineChart() {
        const ctx = document.getElementById('dashboardLineChart') as HTMLCanvasElement;

        this.chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                datasets: [
                    {
                        label: 'Subject',
                        data: [12, 19, 14, 18, 16, 20, 22],
                        borderColor: '#6b46c1',
                        backgroundColor: '#6b46c1',
                        borderRadius: 5
                    },
                    {
                        label: 'Class',
                        data: [8, 11, 9, 13, 12, 15, 14],
                        borderColor: '#7e72bdff',
                        backgroundColor: '#7e72bdff',
                        borderRadius: 5
                    },
                    {
                        label: 'Session',
                        data: [4, 6, 5, 7, 6, 8, 9],
                        borderColor: '#3432c0ff',
                        backgroundColor: '#3432c0ff',
                        borderRadius: 5
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,  
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            boxWidth: 30,
                            font: {
                                size: 11,
                                weight: "bold"
                            },
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false }
                    },
                    y: {
                        grid: {
                            color: '#f1f1f1'
                        },
                        ticks: {
                            font: { size: 11 }
                        }
                    }
                }
            }
        });
    }
}