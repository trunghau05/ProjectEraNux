import { Injectable, inject } from "@angular/core";
import { CanActivate, Router } from "@angular/router";

@Injectable({
    providedIn: 'root'
})
export class AuthGuard implements CanActivate {
    private router = inject(Router);

    async canActivate(): Promise<boolean> {
        const user = sessionStorage.getItem('user');
        if (user) {
            return true;
        }
        alert('You must be logged in to access this page.');
        this.router.navigate(['/login']);
        return false;
    }
}