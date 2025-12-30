import { CommonModule } from "@angular/common";
import { Component, OnInit } from "@angular/core";
import { UserInfo } from "../components/user-info/user-info";


@Component({
    selector: 'app-dashboard',
    imports: [CommonModule, UserInfo],
    template: `
        <style>
            app-user-info {
                position: absolute;
                right: 0;
                top: 0;
            }
        </style>
        <app-user-info></app-user-info>
    `
})
export class Dashboard implements OnInit {
    user = {};

    ngOnInit(): void {
        this.user = JSON.parse(sessionStorage.getItem('user') || '{}');
        console.log(this.user);
    }
}