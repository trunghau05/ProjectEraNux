import { Routes } from '@angular/router';
import { Register } from './pages/register';
import { Login } from './pages/login';
import { Dashboard } from './pages/dashboard';
import { AuthGuard } from './guards/auth';
import { StudentBooking } from './pages/student/booking/booking';
import { TeacherBooking } from './pages/teacher/booking/booking';

export const routes: Routes = [
    { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    { path: 'login', component: Login },
    { path: 'register', component: Register },
    { path: 'dashboard', component: Dashboard, canActivate: [AuthGuard]},

    // Student url
    { path: 'student-booking', component: StudentBooking, canActivate: [AuthGuard]},
    
    // Teacher url
    { path: 'teacher-booking', component: TeacherBooking, canActivate: [AuthGuard]},
    
];
