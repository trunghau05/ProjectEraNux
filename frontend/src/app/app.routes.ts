import { Routes } from '@angular/router';
import { Register } from './pages/register';
import { Login } from './pages/login';
import { Dashboard } from './pages/dashboard';
import { AuthGuard } from './guards/auth.guard';
import { Booking } from './pages/booking';
import { Class } from './pages/class';
import { VideoCallComponent } from './components/video-call/video-call.component';

export const routes: Routes = [
    { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    { path: 'login', component: Login },
    { path: 'register', component: Register },
    { path: 'dashboard', component: Dashboard, canActivate: [AuthGuard]},
    { path: 'booking', component: Booking, canActivate: [AuthGuard]},
    { path: 'class', component: Class, canActivate: [AuthGuard]},
    { path: 'video-call', component: VideoCallComponent, canActivate: [AuthGuard]},
    { path: 'video-call/:roomId', component: VideoCallComponent, canActivate: [AuthGuard]},

    // Student url
    
    // Teacher url
    
];
