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
    const storedUser = JSON.parse(sessionStorage.getItem('user') || '{}');
    this.user.set(storedUser);
  }

  getUser() {
    return this.user();
  }

  setUser(user: User) {
    this.user.set(user);
    sessionStorage.setItem('user', JSON.stringify(user));
  }
}
