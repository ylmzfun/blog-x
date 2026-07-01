import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [RouterLink, FormsModule],
  template: `
    <div class="auth-page">
      <div class="auth-card card">
        <h1 style="font-size:1.5rem;margin-bottom:1.25rem;text-align:center;">Login</h1>
        @if (error()) { <div class="alert alert-error">{{ error() }}</div> }
        <div class="form-group">
          <label>Email or Username</label>
          <input class="form-input" type="text" [(ngModel)]="account" placeholder="Enter email or username" />
        </div>
        <div class="form-group">
          <label>Password</label>
          <input class="form-input" type="password" [(ngModel)]="password" placeholder="Enter password" />
        </div>
        <button class="btn btn-primary w-full mt-md" (click)="doLogin()" [disabled]="loading()">
          {{ loading() ? 'Logging in...' : 'Login' }}
        </button>
        <p class="text-center text-muted mt-md">Don't have an account? <a routerLink="/register">Register</a></p>
      </div>
    </div>
  `,
})
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  account = '';
  password = '';
  loading = signal(false);
  error = signal('');

  async doLogin() {
    if (!this.account || !this.password) { this.error.set('Please fill all fields'); return; }
    this.loading.set(true); this.error.set('');
    try { await this.auth.login(this.account, this.password); this.router.navigate(['/']); }
    catch (e: unknown) { this.error.set((e as Error).message || 'Login failed'); }
    finally { this.loading.set(false); }
  }
}
