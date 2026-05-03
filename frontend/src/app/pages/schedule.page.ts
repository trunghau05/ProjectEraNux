import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { firstValueFrom } from 'rxjs';
import { RoomsService, SessionDetail } from '../apis';
import { SessionListComponent } from '../components/features/session-list/session-list.component';
import { UserService } from '../services/user.service';
import { SessionListStore } from '../stores/session.store';

type SessionJoinState = 'ongoing' | 'upcoming' | 'finished';
type FilterTab = 'all' | 'ongoing' | 'upcoming' | 'finished';

interface SessionByDate {
    date: string;
    displayDate: string;
    sessions: SessionDetail[];
}

@Component({
    selector: 'app-schedule',
    standalone: true,
    imports: [CommonModule, MatIconModule, SessionListComponent],
    template: `
        <style>
            .box { display: flex; align-items: flex-start; width: 100%; height: 100vh; overflow: hidden; }
            .center { flex: 1; padding: 30px; height: 100vh; box-sizing: border-box; overflow: auto; scrollbar-width: none; display: flex; flex-direction: column; gap: 0; }
            .center::-webkit-scrollbar { display: none; }
            app-session-list { flex: 0 0 260px; height: 100vh; overflow: auto; position: sticky; top: 0; align-self: flex-start; }

            .page-title { font-size: 14px; font-weight: 500; }
            .page-date { color: #acacacff; font-size: 12px; }

            .tools { display: flex; align-items: center; gap: 10px; }
            .ic { padding: 5px; background-color: #6b46c1; border-radius: 5px; cursor: pointer; }
            .ic mat-icon { height: 15px; width: 15px; font-size: 15px; color: white; }

            .filter-bar { display: flex; align-items: center; gap: 8px; margin-top: 16px; }
            .filter-tab { font-size: 11px; font-weight: 500; padding: 5px 14px; border-radius: 20px; border: 1px solid #e5e7eb; background: white; cursor: pointer; color: #6b7280; transition: all 0.2s; }
            .filter-tab.active { background: #6b46c1; color: white; border-color: #6b46c1; }

            .schedule-card { flex: 1; background: white; border-radius: 12px; padding: 20px; margin-top: 16px; display: flex; flex-direction: column; min-height: 0; overflow: hidden; }

            .week-nav { display: flex; align-items: center; gap: 8px; }
            .nav-btn { width: 26px; height: 26px; border: none; background: #f5f3ff; border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
            .nav-btn mat-icon { height: 14px; width: 14px; font-size: 14px; color: #6b46c1; }

            .week-picker-trigger {
                display: inline-flex;
                align-items: center;
                gap: 8px;
                height: 30px;
                padding: 0 12px;
                border: 1px solid #e7e5f4;
                border-radius: 8px;
                background: #faf9ff;
                color: #5a3fc0;
                cursor: pointer;
                transition: all 0.2s ease;
            }

            .week-picker-trigger:hover {
                border-color: #d7cff5;
                background: #f4f0ff;
            }

            .week-picker-trigger:focus-visible {
                outline: none;
                box-shadow: 0 0 0 2px rgba(107, 70, 193, 0.2);
            }

            .week-picker-trigger mat-icon {
                width: 16px;
                height: 16px;
                font-size: 16px;
                line-height: 16px;
            }

            .week-picker-text {
                font-size: 10px;
                font-weight: 500;
                white-space: nowrap;
            }

            .week-picker-input { position: absolute; opacity: 0; pointer-events: none; width: 0; height: 0; }

            .type-radio { display: flex; align-items: center; gap: 6px; }
            .type-radio label { font-size: 11px; font-weight: 500; padding: 4px 12px; border-radius: 20px; border: 1px solid #e5e7eb; background: white; cursor: pointer; color: #6b7280; transition: all 0.2s; user-select: none; }
            .type-radio input[type=radio] { display: none; }
            .type-radio input[type=radio]:checked + label { background: #6b46c1; color: white; border-color: #6b46c1; }

            .session-grid { flex: 1; overflow: auto; scrollbar-width: none; margin-top: 16px; }
            .session-grid::-webkit-scrollbar { display: none; }
            .session-row { display: flex; gap: 20px; min-height: 100%; }

            .session-col { display: flex; flex-direction: column; gap: 12px; width: 200px; min-width: 200px; padding-right: 20px; border-right: 1px solid #f1f1f1; }
            .session-col:last-child { border-right: none; }
            .col-date { font-size: 11px; color: #acacacff; text-align: center; display: block; }

            .session-item { border-radius: 10px; padding: 12px; display: flex; flex-direction: column; gap: 6px; background: #fafafa; border: 1px solid #ececec; }

            .session-title { color: #1f1f2e; font-weight: 500; font-size: 12px; }
            .session-time { color: #6b7280; font-size: 11px; margin: 0; }
            .session-status { font-size: 10px; font-weight: 600; padding: 2px 8px; border-radius: 4px; width: fit-content; }
            .status-ongoing { background: #d1fae5; color: #065f46; }
            .status-upcoming { background: #ede9fe; color: #5b21b6; }
            .status-finished { background: #dcdcdc; color: #6b7280; }

            .join-btn { margin-top: 2px; width: 100%; border: none; border-radius: 6px; padding: 7px 8px; font-size: 10px; font-weight: 600; color: #e5e7eb; cursor: pointer; transition: opacity 0.2s; }
            .join-btn.disabled { opacity: 0.4; cursor: not-allowed; }
            .join-btn:not(.disabled):hover { opacity: 0.85; }

            .empty-note { font-size: 12px; color: #9ca3af; text-align: center; margin-top: 40px; width: 100%; }

            .card-container { gap: 20px; width: 100%; }
            .card-item { background-color: white; border-radius: 10px; padding: 15px; gap: 10px; flex: 1; }
            .count { color: black; font-size: 12px; height: 20px; width: 20px; text-align: center; font-weight: 500; }
            .subject { color: black; flex: 1; }
            .subject span { font-size: 12px; font-weight: 500; }
            .subject p { font-size: 10px; margin: 0; }
            .icon { color: white; border-radius: 8px; padding: 10px; background-color: #7f54e4ff; mat-icon { height: 15px; width: 15px; font-size: 15px; } }

            @media (max-width: 768px) {
                .week-nav { width: 100%; justify-content: flex-end; }
                .week-picker-trigger { max-width: 100%; }
            }
        </style>

        <div class="box">
            <div class="center">
                <div class="flex-betw page-title">
                    <span>Schedule</span>
                    <div class="tools flex-cen">
                        <p class="page-date">{{ today | date:'fullDate' }}</p>
                    </div>
                </div>

                <!-- Stats bar -->
                <div class="card-container flex-cen mt-20">
                    <div class="card-item flex-cen">
                        <div class="icon flex-cen">
                            <mat-icon>event</mat-icon>
                        </div>
                        <div class="subject flex-col">
                            <span>Total</span>
                            <p>Sessions</p>
                        </div>
                        <div class="count flex-cen">{{ allSessions().length }}</div>
                    </div>

                    <div class="card-item flex-cen" style="background-color: white;">
                        <div class="icon flex-cen" style="background-color: #005ac0;">
                            <mat-icon>play_circle</mat-icon>
                        </div>
                        <div class="subject flex-col">
                            <span>Ongoing</span>
                            <p>In progress</p>
                        </div>
                        <div class="count flex-cen">{{ ongoingSessions().length }}</div>
                    </div>

                    <div class="card-item flex-cen" style="background-color: white;">
                        <div class="icon flex-cen" style="background-color: #514fe3ff;">
                            <mat-icon>schedule</mat-icon>
                        </div>
                        <div class="subject flex-col">
                            <span>Upcoming</span>
                            <p>Scheduled</p>
                        </div>
                        <div class="count flex-cen">{{ upcomingSessions().length }}</div>
                    </div>

                    <div class="card-item flex-cen" style="background-color: white;">
                        <div class="icon flex-cen" style="background-color: #8e82caff;">
                            <mat-icon>check_circle</mat-icon>
                        </div>
                        <div class="subject flex-col">
                            <span>Finished</span>
                            <p>Completed</p>
                        </div>
                        <div class="count flex-cen">{{ finishedSessions().length }}</div>
                    </div>
                </div>

                <!-- Schedule card -->
                <div class="schedule-card">
                    <div class="flex-betw">
                        <div class="type-radio">
                            <input type="radio" id="type-all" name="typeFilter" value="all" [checked]="typeFilter() === 'all'" (change)="typeFilter.set('all')">
                            <label for="type-all">All</label>
                            <input type="radio" id="type-class" name="typeFilter" value="class" [checked]="typeFilter() === 'class'" (change)="typeFilter.set('class')">
                            <label for="type-class">Class</label>
                            <input type="radio" id="type-tutor" name="typeFilter" value="tutor" [checked]="typeFilter() === 'tutor'" (change)="typeFilter.set('tutor')">
                            <label for="type-tutor">Tutor</label>
                        </div>
                        <div class="week-nav">
                            <button class="nav-btn" (click)="prevWeek()">
                                <mat-icon>chevron_left</mat-icon>
                            </button>
                            <button
                                type="button"
                                class="week-picker-trigger"
                                title="Pick a date"
                                (click)="openWeekPicker(weekPicker)">
                                <mat-icon>today</mat-icon>
                                <span class="week-picker-text">{{ selectedWeekDisplay }}</span>
                            </button>
                            <button class="nav-btn" (click)="nextWeek()">
                                <mat-icon>chevron_right</mat-icon>
                            </button>
                            <input #weekPicker type="date" class="week-picker-input"
                                [value]="selectedWeekDateValue()"
                                (change)="onWeekDateChange($event)">
                        </div>
                    </div>

                    @if (sessionStore.isLoading()) {
                        <p class="empty-note">Loading schedule...</p>
                    } @else if (sessionsByDate().length === 0) {
                        <p class="empty-note">No sessions in the selected week.</p>
                    } @else {
                        <div class="session-grid">
                            <div class="session-row">
                                @for (day of sessionsByDate(); track day.date) {
                                    <div class="session-col">
                                        <span class="col-date">{{ day.displayDate }}</span>
                                        @for (session of day.sessions; track session.id) {
                                            <div class="session-item">
                                                <span class="session-title">{{ getSessionHeadline(session) }}</span>
                                                <p class="session-time">
                                                    {{ session.start_at | date:'HH:mm' }} - {{ session.end_at | date:'HH:mm' }}
                                                </p>
                                                <button
                                                    type="button"
                                                    class="join-btn"
                                                    [class.disabled]="!isSessionJoinable(session) || isJoiningSession(session)"
                                                    [disabled]="!isSessionJoinable(session) || isJoiningSession(session)"
                                                    [style.background-color]="getStatusColor(session)"
                                                    [style.color]="getStatusTextColor(session)"
                                                    (click)="joinSession(session)">
                                                    {{ isJoiningSession(session) ? 'Joining...' : getJoinButtonText(session) }}
                                                </button>
                                            </div>
                                        }
                                    </div>
                                }
                            </div>
                        </div>
                    }
                </div>
            </div>
            <app-session-list (sessionSelected)="jumpToWeek($event)"></app-session-list>
        </div>
    `
})
export class SchedulePage implements OnInit {
    readonly sessionStore = inject(SessionListStore);
    private readonly roomsService = inject(RoomsService);
    private readonly router = inject(Router);
    private readonly userService = inject(UserService);

    readonly user = this.userService.user;
    readonly today = new Date();

    readonly joiningSessionId = signal<number | null>(null);
    readonly roomCodeBySession = signal<Record<number, string>>({});
    readonly activeFilter = signal<FilterTab>('all');
    readonly typeFilter = signal<'all' | 'class' | 'tutor'>('all');

    readonly selectedWeekDate = signal(new Date());
    readonly selectedWeekDateValue = computed(() => this.toLocalDateKey(this.selectedWeekDate()));

    readonly filterTabs: { value: FilterTab; label: string }[] = [
        { value: 'all', label: 'All' },
        { value: 'ongoing', label: 'Ongoing' },
        { value: 'upcoming', label: 'Upcoming' },
        { value: 'finished', label: 'Finished' },
    ];

    readonly allSessions = this.sessionStore.sessions;

    readonly ongoingSessions = computed(() =>
        this.allSessions().filter(s => this.getSessionJoinState(s) === 'ongoing')
    );

    readonly upcomingSessions = computed(() =>
        this.allSessions().filter(s => this.getSessionJoinState(s) === 'upcoming')
    );

    readonly finishedSessions = computed(() =>
        this.allSessions().filter(s => this.getSessionJoinState(s) === 'finished')
    );

    readonly filteredSessions = computed(() => {
        const filter = this.activeFilter();
        const type = this.typeFilter();
        let sessions = this.allSessions();
        if (filter === 'ongoing') sessions = this.ongoingSessions();
        else if (filter === 'upcoming') sessions = this.upcomingSessions();
        else if (filter === 'finished') sessions = this.finishedSessions();
        if (type === 'class') return sessions.filter(s => !!(s as any).class_obj);
        if (type === 'tutor') return sessions.filter(s => !(s as any).class_obj && !!s.time_slot);
        return sessions;
    });

    readonly sessionsByDate = computed<SessionByDate[]>(() => {
        const { start, end } = this.getWeekRange(this.selectedWeekDate());
        const weekStartKey = this.toLocalDateKey(start);
        const weekEndKey = this.toLocalDateKey(end);

        const inWeek = this.filteredSessions().filter(s => {
            const key = this.toLocalDateKey(s.start_at);
            return key >= weekStartKey && key <= weekEndKey;
        });

        return this.groupByDate(inWeek);
    });

    get selectedWeekDisplay(): string {
        const { start, end } = this.getWeekRange(this.selectedWeekDate());
        const fmt: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
        return `${start.toLocaleDateString('en-US', fmt)} – ${end.toLocaleDateString('en-US', fmt)}`;
    }

    ngOnInit(): void {
        // Load the session list from the store on page initialization
        this.sessionStore.loadSessionList();
    }

    setFilter(tab: FilterTab): void {
        // Switch the active status filter tab (all / ongoing / upcoming / finished)
        this.activeFilter.set(tab);
    }

    jumpToWeek(date: Date): void {
        // Navigate the week view to the week that contains the given date
        this.selectedWeekDate.set(date);
    }

    prevWeek(): void {
        // Move the selected week back by 7 days
        const d = new Date(this.selectedWeekDate());
        d.setDate(d.getDate() - 7);
        this.selectedWeekDate.set(d);
    }

    nextWeek(): void {
        // Move the selected week forward by 7 days
        const d = new Date(this.selectedWeekDate());
        d.setDate(d.getDate() + 7);
        this.selectedWeekDate.set(d);
    }

    openWeekPicker(input: HTMLInputElement): void {
        // Programmatically open the native date picker if supported, otherwise focus + click
        const el = input as HTMLInputElement & { showPicker?: () => void };
        if (el.showPicker) { el.showPicker(); return; }
        input.focus();
        input.click();
    }

    onWeekDateChange(event: Event): void {
        // When the user picks a date, update the selected week anchor
        const value = (event.target as HTMLInputElement).value;
        if (!value) return;
        const d = new Date(`${value}T00:00:00`);
        // Ignore invalid date values
        if (Number.isNaN(d.getTime())) return;
        this.selectedWeekDate.set(d);
    }

    getSessionClass(session: SessionDetail): string {
        // Return a CSS class name based on the session type (class-based, tutor slot, or default)
        if ((session as any).class_obj) return 'session-teacher';
        if (session.time_slot) return 'session-tutor';
        return 'session-default';
    }

    getSessionHeadline(session: SessionDetail): string {
        // Build a display headline: "<student or subject> - <teacher name>"
        const s = session as any;
        const studentName = s.student?.name;
        const teacherName = s.teacher?.name;
        const subjectName = s.class_obj?.subject?.name;
        const classId = s.class_obj?.id;
        const left = studentName || subjectName || (classId ? `Class #${classId}` : 'Private session');
        const right = teacherName || 'Unknown teacher';
        return `${left} - ${right}`;
    }

    getSessionJoinState(session: SessionDetail): SessionJoinState {
        // Cancelled or finished sessions are always shown as finished
        if (session.status === 'finished' || session.status === 'cancelled') return 'finished';
        // Compare date keys (YYYY-MM-DD) to determine if the session is today, future, or past
        const todayKey = this.toLocalDateKey(new Date());
        const startKey = this.toLocalDateKey(session.start_at);
        if (todayKey === startKey) return 'ongoing';
        if (todayKey < startKey) return 'upcoming';
        return 'finished';
    }

    isSessionJoinable(session: SessionDetail): boolean {
        // Only ongoing sessions can be joined
        return this.getSessionJoinState(session) === 'ongoing';
    }

    isJoiningSession(session: SessionDetail): boolean {
        // Check whether this session is currently being joined (shows a loading state)
        return this.joiningSessionId() === session.id;
    }

    getJoinButtonText(session: SessionDetail): string {
        // Return the appropriate button label based on the session's join state
        const state = this.getSessionJoinState(session);
        if (state === 'ongoing') return 'Join Now';
        if (state === 'upcoming') return 'Upcoming';
        return 'Finished';
    }

    getStatusColor(session: SessionDetail): string {
        // Return a background color for the join button that reflects the session state
        const state = this.getSessionJoinState(session);
        if (state === 'ongoing') return '#005ac0';
        if (state === 'upcoming') return '#514fe3';
        return '#dcdcdc';
    }

    getStatusTextColor(session: SessionDetail): string {
        // Finished sessions use a dark text color; others use light text on colored backgrounds
        const state = this.getSessionJoinState(session);
        if (state === 'finished') return '#374151';
        return '#e5e7eb';
    }

    async joinSession(session: SessionDetail): Promise<void> {
        // Guard: only joinable (ongoing) sessions can be entered
        if (!this.isSessionJoinable(session)) return;

        const sessionId = Number(session.id);
        // Guard: ensure the session ID is a valid integer
        if (!sessionId || Number.isNaN(sessionId)) return;
        // Guard: prevent duplicate join attempts for the same session
        if (this.joiningSessionId() === sessionId) return;

        this.joiningSessionId.set(sessionId);
        try {
            // Use cached room code if available to avoid an extra API call
            let roomCode = this.roomCodeBySession()[sessionId];
            if (!roomCode) {
                // Fetch the room associated with this session from the API
                const room = await firstValueFrom(this.roomsService.roomsBySessionRetrieve(sessionId));
                roomCode = room.room_code;
                if (!roomCode) throw new Error(`Room code missing for session ${sessionId}`);
                // Cache the room code for subsequent join attempts
                this.roomCodeBySession.update(cache => ({ ...cache, [sessionId]: roomCode }));
            }
            // Navigate to the video-call route with the room code and session ID
            this.router.navigate(['/video-call', roomCode], { queryParams: { sessionId } });
        } catch (err) {
            console.error(`Failed to join session ${sessionId}:`, err);
        } finally {
            // Always clear the joining indicator regardless of success or failure
            this.joiningSessionId.set(null);
        }
    }

    private toLocalDateKey(dateValue: string | Date): string {
        // Format a date as a YYYY-MM-DD string using local time (not UTC) for correct date grouping
        const d = new Date(dateValue);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    }

    private getWeekRange(anchor: Date): { start: Date; end: Date } {
        // Calculate the Monday–Sunday range for the week containing the anchor date
        const d = new Date(anchor);
        d.setHours(0, 0, 0, 0);
        // Compute the offset to the Monday of this week (Sunday = day 0 requires -6)
        const diff = d.getDay() === 0 ? -6 : 1 - d.getDay();
        const start = new Date(d);
        start.setDate(d.getDate() + diff);
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        return { start, end };
    }

    private groupByDate(sessions: SessionDetail[]): SessionByDate[] {
        // Group sessions by their local date key (YYYY-MM-DD)
        const map = new Map<string, SessionDetail[]>();
        sessions.forEach(s => {
            const key = this.toLocalDateKey(s.start_at);
            if (!map.has(key)) map.set(key, []);
            map.get(key)!.push(s);
        });
        // Sort columns by date and sort sessions within each day by start time
        return Array.from(map.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, list]) => ({
                date,
                displayDate: new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
                    weekday: 'short', month: 'short', day: 'numeric'
                }),
                sessions: list.sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())
            }));
    }
}
