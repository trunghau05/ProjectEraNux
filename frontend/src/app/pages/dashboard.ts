import { CommonModule } from "@angular/common";
import { Component, inject, OnInit, signal } from "@angular/core";
import { UserInfo } from "../components/user-info/user-info";
import { MatIconModule } from "@angular/material/icon";
import { Chart, registerables  } from "chart.js";
import { MatProgressBar } from "@angular/material/progress-bar";
import { ClassDetail, ClassesService } from "../apis";

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
            .card-item { background-color: #6b46c1; border-radius: 10px; padding: 10px; gap: 10px; }
            .count { color: white; font-size: 12px; height: 20px; width: 20px; border-radius: 8px; padding: 10px; background-color: #7f54e4ff; text-align: center; font-weight: 500; }
            .subject { color: white; margin-right: 25px; }
            .subject span { font-size: 12px; font-weight: 500; }
            .subject p { font-size: 10px; }
            .icon { color: white; }
            .board { overflow: auto; scrollbar-width: thin; }
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
            .schedule-col { display: flex; flex-direction: column; align-items: center; gap: 6px; width: 180px; }.center::-webkit-scrollbar, app-user-info::-webkit-scrollbar { width: 10px; height: 10px; }
            .center::-webkit-scrollbar-track, app-user-info::-webkit-scrollbar-track { background: #f1f1f1; border-radius: 10px; }
            .center::-webkit-scrollbar-thumb, app-user-info::-webkit-scrollbar-thumb { background: #6b46c1; border-radius: 10px; border: 2px solid transparent; background-clip: padding-box; }
            .center::-webkit-scrollbar-button, app-user-info::-webkit-scrollbar-button { display: none; width: 0; height: 0; }
            .center, app-user-info { scrollbar-width: thin; scrollbar-color: #6b46c1 #f1f1f1; }
            mat-progress-bar { background-color: #e9e9e9ff; color: #bb295fff; border-radius: 5px; }
            .booking { background-color: white; width: 100%; height: 190px; }
        </style>

        <div class="box">
            @if (user.role === 'student') {
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
                            <div class="count flex-cen">08</div>
                            <div class="subject flex-col">
                                <span>Hours</span>
                                <p>Description</p>
                            </div>
                            <div class="icon flex-cen">
                                <mat-icon>arrow_right</mat-icon>
                            </div>
                        </div>

                        <div class="card-item flex-cen" style="background-color: #7e72bdff;">
                            <div class="count flex-cen" style="background-color: #8e82caff;">12</div>
                            <div class="subject flex-col">
                                <span>Class</span>
                                <p>Description</p>
                            </div>
                            <div class="icon flex-cen">
                                <mat-icon>arrow_right</mat-icon>
                            </div>
                        </div>

                        <div class="card-item flex-cen" style="background-color: #3432c0ff;">
                            <div class="count flex-cen" style="background-color: #514fe3ff;">03</div>
                            <div class="subject flex-col">
                                <span>Session</span>
                                <p>Description</p>
                            </div>
                            <div class="icon flex-cen">
                                <mat-icon>arrow_right</mat-icon>
                            </div>
                        </div>

                        <div class="card-item flex-cen" style="background-color: #a71f50ff;">
                            <div class="count flex-cen" style="background-color: #bb295fff;">05</div>
                            <div class="subject flex-col">
                                <span>Message</span>
                                <p>Description</p>
                            </div>
                            <div class="icon flex-cen">
                                <mat-icon>arrow_right</mat-icon>
                            </div>
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
                                        <div class="schedule-col flex-col" style="gap: 20px;">
                                            <span>Thursday, January 8, 2026</span>
                                            <div class="schedule-item" style="gap: 5px; background-color: #7e72bdff; width: 100%; border-radius: 10px; padding: 10px; box-sizing: border-box;">
                                                <span style="color: white; font-weight: 500; font-size: 12px;text-align: left;">Mathematics - Nguyen Van Minh</span>
                                                <p style="color: #f0f0f0ff; font-size: 11px; margin: 0;">09:00 - 10:30</p>
                                            </div>
                                            <div class="schedule-item" style="gap: 5px; background-color: #7e72bdff; width: 100%; border-radius: 10px; padding: 10px; box-sizing: border-box;">
                                                <span style="color: white; font-weight: 500; font-size: 12px;text-align: left;">Mathematics - Nguyen Van Minh</span>
                                                <p style="color: #f0f0f0ff; font-size: 11px; margin: 0;">09:00 - 10:30</p>
                                            </div>
                                            <div class="schedule-item" style="gap: 5px; background-color: #7e72bdff; width: 100%; border-radius: 10px; padding: 10px; box-sizing: border-box;">
                                                <span style="color: white; font-weight: 500; font-size: 12px;text-align: left;">Mathematics - Nguyen Van Minh</span>
                                                <p style="color: #f0f0f0ff; font-size: 11px; margin: 0;">09:00 - 10:30</p>
                                            </div>
                                        </div>

                                        <div class="schedule-col flex-col" style="gap: 20px;">
                                            <span>Thursday, January 8, 2026</span>
                                            <div class="schedule-item" style="gap: 5px; background-color: #7e72bdff; width: 100%; border-radius: 10px; padding: 10px; box-sizing: border-box;">
                                                <span style="color: white; font-weight: 500; font-size: 12px;text-align: left;">Mathematics - Nguyen Van Minh</span>
                                                <p style="color: #f0f0f0ff; font-size: 11px; margin: 0;">09:00 - 10:30</p>
                                            </div>
                                            <div class="schedule-item" style="gap: 5px; background-color: #7e72bdff; width: 100%; border-radius: 10px; padding: 10px; box-sizing: border-box;">
                                                <span style="color: white; font-weight: 500; font-size: 12px;text-align: left;">Mathematics - Nguyen Van Minh</span>
                                                <p style="color: #f0f0f0ff; font-size: 11px; margin: 0;">09:00 - 10:30</p>
                                            </div>
                                        </div>

                                        <div class="schedule-col flex-col" style="gap: 20px;">
                                            <span>Thursday, January 8, 2026</span>
                                            <div class="schedule-item" style="gap: 5px; background-color: #7e72bdff; width: 100%; border-radius: 10px; padding: 10px; box-sizing: border-box;">
                                                <span style="color: white; font-weight: 500; font-size: 12px;text-align: left;">Mathematics - Nguyen Van Minh</span>
                                                <p style="color: #f0f0f0ff; font-size: 11px; margin: 0;">09:00 - 10:30</p>
                                            </div>
                                        </div>

                                        <div class="schedule-col flex-col" style="gap: 20px;">
                                            <span>Thursday, January 8, 2026</span>
                                            <div class="schedule-item" style="gap: 5px; background-color: #7e72bdff; width: 100%; border-radius: 10px; padding: 10px; box-sizing: border-box;">
                                                <span style="color: white; font-weight: 500; font-size: 12px;text-align: left;">Mathematics - Nguyen Van Minh</span>
                                                <p style="color: #f0f0f0ff; font-size: 11px; margin: 0;">09:00 - 10:30</p>
                                            </div>
                                            <div class="schedule-item" style="gap: 5px; background-color: #7e72bdff; width: 100%; border-radius: 10px; padding: 10px; box-sizing: border-box;">
                                                <span style="color: white; font-weight: 500; font-size: 12px;text-align: left;">Mathematics - Nguyen Van Minh</span>
                                                <p style="color: #f0f0f0ff; font-size: 11px; margin: 0;">09:00 - 10:30</p>
                                            </div>
                                            <div class="schedule-item" style="gap: 5px; background-color: #7e72bdff; width: 100%; border-radius: 10px; padding: 10px; box-sizing: border-box;">
                                                <span style="color: white; font-weight: 500; font-size: 12px;text-align: left;">Mathematics - Nguyen Van Minh</span>
                                                <p style="color: #f0f0f0ff; font-size: 11px; margin: 0;">09:00 - 10:30</p>
                                            </div>
                                            <div class="schedule-item" style="gap: 5px; background-color: #7e72bdff; width: 100%; border-radius: 10px; padding: 10px; box-sizing: border-box;">
                                                <span style="color: white; font-weight: 500; font-size: 12px;text-align: left;">Mathematics - Nguyen Van Minh</span>
                                                <p style="color: #f0f0f0ff; font-size: 11px; margin: 0;">09:00 - 10:30</p>
                                            </div>
                                        </div>
                                        
                                        <div class="schedule-col flex-col" style="gap: 20px;"11>
                                            <span>Thursday, January 8, 2026</span>
                                            <div class="schedule-item" style="gap: 5px; background-color: #7e72bdff; width: 100%; border-radius: 10px; padding: 10px; box-sizing: border-box;">
                                                <span style="color: white; font-weight: 500; font-size: 12px;text-align: left;">Mathematics - Nguyen Van Minh</span>
                                                <p style="color: #f0f0f0ff; font-size: 11px; margin: 0;">09:00 - 10:30</p>
                                            </div>
                                            <div class="schedule-item" style="gap: 5px; background-color: #7e72bdff; width: 100%; border-radius: 10px; padding: 10px; box-sizing: border-box;">
                                                <span style="color: white; font-weight: 500; font-size: 12px;text-align: left;">Mathematics - Nguyen Van Minh</span>
                                                <p style="color: #f0f0f0ff; font-size: 11px; margin: 0;">09:00 - 10:30</p>
                                            </div>
                                            <div class="schedule-item" style="gap: 5px; background-color: #7e72bdff; width: 100%; border-radius: 10px; padding: 10px; box-sizing: border-box;">
                                                <span style="color: white; font-weight: 500; font-size: 12px;text-align: left;">Mathematics - Nguyen Van Minh</span>
                                                <p style="color: #f0f0f0ff; font-size: 11px; margin: 0;">09:00 - 10:30</p>
                                            </div>
                                            <div class="schedule-item" style="gap: 5px; background-color: #7e72bdff; width: 100%; border-radius: 10px; padding: 10px; box-sizing: border-box;">
                                                <span style="color: white; font-weight: 500; font-size: 12px;text-align: left;">Mathematics - Nguyen Van Minh</span>
                                                <p style="color: #f0f0f0ff; font-size: 11px; margin: 0;">09:00 - 10:30</p>
                                            </div>
                                            <div class="schedule-item" style="gap: 5px; background-color: #7e72bdff; width: 100%; border-radius: 10px; padding: 10px; box-sizing: border-box;">
                                                <span style="color: white; font-weight: 500; font-size: 12px;text-align: left;">Mathematics - Nguyen Van Minh</span>
                                                <p style="color: #f0f0f0ff; font-size: 11px; margin: 0;">09:00 - 10:30</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="label flex-betw mt-20">
                        <span>Your Bookings</span>
                        <div class="flex-cen" style="gap: 10px;"> 
                            <span>More</span>
                            <mat-icon>arrow_right_alt</mat-icon>
                        </div>
                    </div>
                    <div class="booking mt-20">
                        
                    </div>
                </div>
            }
    
            @if (user.role === 'teacher' || user.role === 'tutor') {
                <div class="center">
        
                </div>
            }
            <app-user-info></app-user-info>
        </div>
    `
})
export class Dashboard implements OnInit {
    private classService = inject(ClassesService);

    classes = signal<ClassDetail[]>([]);

    user = {
        id: 0,
        role: ''
    };

    today = new Date();
    chart!: Chart;

    currentValue = 30;
    maxValue = 100;

    
    get progressPercent() {
        return (this.currentValue / this.maxValue) * 100;
    }

    ngOnInit(): void {
        this.user = JSON.parse(sessionStorage.getItem('user') || '{}');
        console.log(this.user);

        this.getClassList();

        Chart.register(...registerables);
        setTimeout(() => {
            this.initLineChart();
        });
    }

    getClassList() {
        if (this.user.role === 'student') {
            this.classService.classesByStudentList(this.user.id).subscribe({
                next: (res) => {
                    this.classes.set(res);
                },
                error: (err) => {
                    console.error('Failed to get class list by student: ' + err.message);
                }
            });
        } else {
            this.classService.classesByTeacherList(this.user.id).subscribe({
                next: (res) => {
                    this.classes.set(res);
                },
                error: (err) => {
                    console.error('Failed to get class list by teacher: ' + err.message);
                }
            });
        }
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