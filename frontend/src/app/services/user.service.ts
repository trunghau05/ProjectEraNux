import { Injectable, signal } from '@angular/core';

export interface User {
  id: number;
  role: string;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  user = signal<User>({
    id: 0,
    role: ''
  });

  constructor() {
    this.loadUser();
  }

  loadUser() {
    // Parse the user JSON stored in session storage; fall back to an empty object if absent
    const storedUser = JSON.parse(sessionStorage.getItem('user') || '{}');
    this.user.set(storedUser);
  }

  getUser() {
    // Return the current value of the user signal
    return this.user();
  }

  setUser(user: User) {
    // Update the in-memory signal and persist the user to session storage
    this.user.set(user);
    sessionStorage.setItem('user', JSON.stringify(user));
  }
}
