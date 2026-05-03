import { Injectable, inject } from "@angular/core";
import { CanActivate, Router } from "@angular/router";
import { ToastService } from '../services/toast.service';

@Injectable({
    providedIn: 'root'
})
export class AuthGuard implements CanActivate {
    private router = inject(Router);
    private toastService = inject(ToastService);

    async canActivate(): Promise<boolean> {
        // Check if the user data exists in session storage (set during login)
        const user = sessionStorage.getItem('user');
        if (user) {
            // User is authenticated — allow navigation
            return true;
        }
        // User is not authenticated; display a warning and redirect to the login page
        this.toastService.warning('You must be logged in to access this page.');
        this.router.navigate(['/login']);
        return false;
    }
}