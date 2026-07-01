import { Injectable, signal, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiService } from './api.service';
import { User, LoginResponse } from './models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private api = inject(ApiService);
  private router = inject(Router);

  private _user = signal<User | null>(null);
  private _accessToken = signal<string | null>(null);
  private _refreshToken = signal<string | null>(null);

  readonly user = this._user.asReadonly();
  readonly isLoggedIn = computed(() => !!this._accessToken());
  readonly isAdmin = computed(() => this._user()?.role === 'admin');

  constructor() {
    const at = localStorage.getItem('access_token');
    const rt = localStorage.getItem('refresh_token');
    if (at) this._accessToken.set(at);
    if (rt) this._refreshToken.set(rt);
    const userJson = localStorage.getItem('user');
    if (userJson) {
      try { this._user.set(JSON.parse(userJson)); } catch { /* ignore */ }
    }
  }

  getAccessToken(): string | null {
    return this._accessToken();
  }

  async login(account: string, password: string): Promise<LoginResponse> {
    const res = await firstValueFrom(this.api.login({ account, password }));
    if (res.code === 0 && res.data) {
      this.setSession(res.data);
      return res.data;
    }
    throw new Error(res.message);
  }

  async register(username: string, email: string, password: string): Promise<void> {
    const res = await firstValueFrom(this.api.register({ username, email, password }));
    if (res.code !== 0) throw new Error(res.message);
  }

  async refreshToken(): Promise<string | null> {
    const rt = this._refreshToken();
    if (!rt) return null;
    try {
      const res = await firstValueFrom(this.api.refresh({ refresh_token: rt }));
      if (res?.code === 0 && res.data) {
        this._accessToken.set(res.data.accessToken);
        this._refreshToken.set(res.data.refreshToken);
        localStorage.setItem('access_token', res.data.accessToken);
        localStorage.setItem('refresh_token', res.data.refreshToken);
        return res.data.accessToken;
      }
    } catch { /* ignore */ }
    return null;
  }

  private setSession(data: LoginResponse) {
    this._accessToken.set(data.accessToken);
    this._refreshToken.set(data.refreshToken);
    this._user.set(data.user);
    localStorage.setItem('access_token', data.accessToken);
    localStorage.setItem('refresh_token', data.refreshToken);
    localStorage.setItem('user', JSON.stringify(data.user));
  }

  logout() {
    this.api.logout().subscribe();
    this._accessToken.set(null);
    this._refreshToken.set(null);
    this._user.set(null);
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    this.router.navigate(['/']);
  }

  fetchProfile() {
    this.api.getMe().subscribe({
      next: (res) => {
        if (res.code === 0 && res.data) {
          this._user.set(res.data);
          localStorage.setItem('user', JSON.stringify(res.data));
        }
      },
    });
  }
}
