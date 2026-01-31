import { CommonModule } from "@angular/common";
import { Component, inject, OnInit, signal } from "@angular/core";
import { UserInfo } from "../components/user-info/user-info";
import { MatIconModule } from "@angular/material/icon";
import { Chart, registerables  } from "chart.js";
import { MatProgressBar } from "@angular/material/progress-bar";
import { ClassDetail, ClassesService, SessionDetail, SessionsService } from "../apis";
import { Router } from "@angular/router";
import { UserService } from "../services/user.service";

interface SessionByDate {
  date: string;        // 2026-01-08
  displayDate: string; // Thursday, January 8, 2026
  sessions: SessionDetail[];
}

@Component({
    selector: 'app-dashboard',
    imports: [CommonModule, UserInfo, MatIconModule, MatProgressBar],
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
            .board { overflow: auto; scrollbar-width: none; }
            .board-item { padding: 20px; background-color: white; border-radius: 10px; height: 305px; }
            .board-container { display: flex; justify-content: center; width: 100%; gap: 20px; }
            .board-label, .label { }
            .board-label span, .label span { font-size: 12px; font-weight: 500; }
            .board-label mat-icon, .label mat-icon { height: 15px; width: 15px; font-size: 15px; }
            .class-item { padding: 20px 0; border-bottom: 1px solid #f1f1f1; span { font-size: 11px; font-weight: 500; } p { font-size: 11px; color: #acacacff; } }
            .class-item:last-child { border: none; padding-bottom: 0; }
            .list { height: 320px; width: 45%; }
            .schedule { height: 320px; width: 55%; }
            .schedule-table { display: flex; overflow: auto; height: calc(100vh - 307px); scrollbar-width: none; }
            .schedule-table span { font-size: 11px; color: #acacacff; display: block; text-align: center; }
            .schedule-item { display: flex; flex-direction: column; }
            .schedule-col { display: flex; flex-direction: column; align-items: center; gap: 6px; width: 180px; border-right: 1px solid #f1f1f1; padding-right: 20px; }
            .schedule-col:last-child { border-right: none; }
            .center::-webkit-scrollbar, app-user-info::-webkit-scrollbar { width: 10px; height: 10px; }
            .center::-webkit-scrollbar-track, app-user-info::-webkit-scrollbar-track { background: #f1f1f1; border-radius: 10px; }
            .center::-webkit-scrollbar-thumb, app-user-info::-webkit-scrollbar-thumb { background: #6b46c1; border-radius: 10px; border: 2px solid transparent; background-clip: padding-box; }
            .center::-webkit-scrollbar-button, app-user-info::-webkit-scrollbar-button { display: none; width: 0; height: 0; }
            .center, app-user-info { scrollbar-width: thin; scrollbar-color: #6b46c1 #f1f1f1; }
            mat-progress-bar { background-color: #e9e9e9ff; color: #bb295fff; border-radius: 5px; }
            .booking { width: 100%; }
            .session-teacher { background-color: #7e72bdff !important; }
            .session-tutor { background-color: #514fe3ff !important; }
            .session-default { background-color: #6b46c1 !important; }
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
                        <div class="list board-item flex-col">
                            <div class="board-label flex-betw">
                                <span>Class Board</span>
                                <div>
                                    <mat-icon>arrow_right_alt</mat-icon>
                                </div>
                            </div>
                            <div class="board flex-col">
                                @for (c of classes(); track c.id) {
                                    <div class="class-item flex-cen">
                                        <div class="flex-col" style="width: 65%; gap: 5px;">
                                            <span>{{ c.description }}</span>
                                            <p>{{ c.teacher.name }}</p>
                                        </div>
                                        <div class="flex-cen" style="gap: 10px; width: 35%">
                                            <mat-progress-bar
                                                mode="determinate"
                                                [value]="progressPercent">
                                            </mat-progress-bar>
                                            <span>{{ progressPercent }}%</span>
                                        </div>
                                    </div>
                                }
                            </div>
                        </div>

                        <div class="schedule board-item flex-col">
                            <div class="board-label flex-betw">
                                <span>Schedule Board</span>
                                <div>
                                    <mat-icon>today</mat-icon>
                                </div>
                            </div>
                            <div class="board mt-20">
                                <div class="schedule-table">
                                    <div class="schedule-row" style="display: flex; gap: 20px;">
                                        @for (day of sessionsByDate(); track day.date) {
                                            <div class="schedule-col flex-col" style="gap: 20px;">
                                                <span>{{ day.displayDate }}</span>

                                                @for (session of day.sessions; track session.id) {
                                                    <div class="schedule-item" [ngClass]="getSessionClass(session)" style="gap: 5px; width: 100%; border-radius: 10px; padding: 10px; box-sizing: border-box;">
                                                        <span style="color: white; font-weight: 500; font-size: 12px; text-align: left;">
                                                            {{ session.student.name }} - {{ session.teacher.name }}
                                                        </span>
                                                        <p style="color: #f0f0f0ff; font-size: 11px; margin: 0;">
                                                            {{ session.start_at | date:'HH:mm' }} - {{ session.end_at | date:'HH:mm' }} 
                                                        </p>
                                                    </div>
                                                }
                                            </div>
                                        }
                                    </div>
                                </div>
                            </div>
                        </div>
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
                        <div class="list board-item flex-col">
                            <div class="board-label flex-betw">
                                <span>Class Board</span>
                                <div>
                                    <mat-icon>arrow_right_alt</mat-icon>
                                </div>
                            </div>
                            <div class="board flex-col">
                                @for (c of classes(); track c.id) {
                                    <div class="class-item flex-cen">
                                        <div class="flex-col" style="width: 65%; gap: 5px;">
                                            <span>{{ c.description }}</span>
                                            <p>{{ c.teacher.name }}</p>
                                        </div>
                                        <div class="flex-cen" style="gap: 10px; width: 35%">
                                            <mat-progress-bar
                                                mode="determinate"
                                                [value]="progressPercent">
                                            </mat-progress-bar>
                                            <span>{{ progressPercent }}%</span>
                                        </div>
                                    </div>
                                }
                            </div>
                        </div>

                        <div class="schedule board-item flex-col">
                            <div class="board-label flex-betw">
                                <span>Schedule Board</span>
                                <div>
                                    <mat-icon>today</mat-icon>
                                </div>
                            </div>
                            <div class="board mt-20">
                                <div class="schedule-table">
                                    <div class="schedule-row" style="display: flex; gap: 20px;">
                                        @for (day of sessionsByDate(); track day.date) {
                                            <div class="schedule-col flex-col" style="gap: 20px;">
                                                <span>{{ day.displayDate }}</span>

                                                @for (session of day.sessions; track session.id) {
                                                    <div class="schedule-item" [ngClass]="getSessionClass(session)" style="gap: 5px; width: 100%; border-radius: 10px; padding: 10px; box-sizing: border-box;">
                                                        <span style="color: white; font-weight: 500; font-size: 12px; text-align: left;">
                                                            {{ session.student.name }} - {{ session.teacher.name }}
                                                        </span>
                                                        <p style="color: #f0f0f0ff; font-size: 11px; margin: 0;">
                                                            {{ session.start_at | date:'HH:mm' }} - {{ session.end_at | date:'HH:mm' }} 
                                                        </p>
                                                    </div>
                                                }
                                            </div>
                                        }
                                    </div>
                                </div>
                            </div>
                        </div>
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
    private classService = inject(ClassesService);
    private sessionService = inject(SessionsService);
    private router = inject(Router);
    private userService = inject(UserService);

    classes = signal<ClassDetail[]>([]);
    sessions = signal<SessionDetail[]>([]);
    sessionsByDate = signal<SessionByDate[]>([]);

    user = this.userService.user;

    setClass: string = '';

    today = new Date();
    chart!: Chart;

    currentValue = 30;
    maxValue = 100;

    
    get progressPercent() {
        return (this.currentValue / this.maxValue) * 100;
    }

    ngOnInit(): void {
        console.log(this.user());

        this.getClassList();
        this.getSessionList();

        Chart.register(...registerables);
        setTimeout(() => {
            this.initLineChart();
        });
    }

    getClassList() {
        if (this.user().role === 'student') {
            this.classService.classesByStudentList(this.user().id).subscribe({
                next: (res) => {
                    this.classes.set(res);
                },
                error: (err) => {
                    console.error('Failed to get class list by student: ' + err.message);
                }
            });
        } else {
            this.classService.classesByTeacherList(this.user().id).subscribe({
                next: (res) => {
                    this.classes.set(res);
                },
                error: (err) => {
                    console.error('Failed to get class list by teacher: ' + err.message);
                }
            });
        }
    }

    private groupSessionsByDate(sessions: SessionDetail[]): SessionByDate[] {
        const map = new Map<string, SessionDetail[]>();

        sessions.forEach(session => {
            const start = new Date(session.start_at);
            const key = start.toISOString().split('T')[0];

            if (!map.has(key)) {
                map.set(key, []);
            }
            map.get(key)!.push(session);
        });

        return Array.from(map.entries())
            .sort(([a], [b]) => a.localeCompare(b)) 
            .map(([date, sessions]) => ({
                date,
                displayDate: new Date(date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                }),
                sessions: sessions.sort((a, b) =>  new Date(a.start_at).getTime() - new Date(b.start_at).getTime())
            }));
    }

    getSessionList() {
        const handleResponse = (res: SessionDetail[]) => {
            this.sessions.set(res);
            this.sessionsByDate.set(this.groupSessionsByDate(res));
        };

        if (this.user().role === 'student') {
            this.sessionService.sessionsByStudentList(this.user().id).subscribe({
                next: handleResponse,
                error: err => {
                    console.error('Failed to get session list by student:', err);
                }
            });
        } else if (this.user().role === 'teacher' || this.user().role === 'tutor') {
            this.sessionService.sessionsByTeacherList(this.user().id).subscribe({
                next: handleResponse,
                error: err => {
                    console.error('Failed to get session list by teacher:', err);
                }
            });
        }
    }

    getSessionClass(session: SessionDetail): string {
        if (session.class_obj) {
            return 'session-teacher';
        }

        if (session.time_slot) {
            return 'session-tutor';
        }

        return 'session-default';
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