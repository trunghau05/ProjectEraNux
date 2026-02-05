import { Component, signal } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { Navbar } from './components/shared/navbar/navbar';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Navbar, CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('frontend');

  constructor(private router: Router) {}

  hide(route: string) {
    return this.router.url.startsWith(`/${route}`);
  }

  // Show navbar only when NOT on login, register, or video-call pages
  shouldHideNavbar(): boolean {
    const url = this.router.url;
    return url.startsWith('/login') || 
           url.startsWith('/register') || 
           url.startsWith('/video-call');
  }
}
