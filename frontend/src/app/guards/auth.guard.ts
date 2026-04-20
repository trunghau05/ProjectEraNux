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
        const user = sessionStorage.getItem('user');
        if (user) {
            return true;
        }
        this.toastService.warning('You must be logged in to access this page.');
        this.router.navigate(['/login']);
        return false;
    }
}