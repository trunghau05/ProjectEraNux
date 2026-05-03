import { Component, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-navbar',
  imports: [MatIconModule, CommonModule],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss',
})
export class Navbar {
  private router = inject(Router);

  navigateTo(route: string): void {
    this.router.navigate([route]);
  }

  isActive(route: string): boolean {
    const currentUrl = this.router.url.split('?')[0].split('#')[0];
    const target = `/${route}`;

    if (route === 'dashboard') {
      return currentUrl === '/' || currentUrl === '/dashboard' || currentUrl.startsWith('/dashboard/');
    }

    return currentUrl === target || currentUrl.startsWith(`${target}/`);
  }
}
