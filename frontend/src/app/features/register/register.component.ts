import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [RouterLink, FormsModule],
  template: `
    <div class="auth-page">
      <div class="auth-card card">
        <h1 style="font-size:1.5rem;margin-bottom:1.25rem;text-align:center;">Register</h1>
        @if (error()) { <div class="alert alert-error">{{ error() }}</div> }
        @if (success()) {
          <div class="alert alert-success">Registration successful! <a routerLink="/login">Click here to login</a></div>
        }
        <div class="form-group">
          <label>Username</label>
          <input class="form-input" type="text" [(ngModel)]="username" placeholder="Choose a username" />
        </div>
        <div class="form-group">
          <label>Email</label>
          <input class="form-input" type="email" [(ngModel)]="email" placeholder="Enter your email" />
        </div>
        <div class="form-group">
          <label>Password</label>
          <input class="form-input" type="password" [(ngModel)]="password" placeholder="Min 6 characters" />
        </div>
        <button class="btn btn-primary w-full mt-md" (click)="doRegister()" [disabled]="loading()">
          {{ loading() ? 'Registering...' : 'Register' }}
        </button>
        <p class="text-center text-muted mt-md">Already have an account? <a routerLink="/login">Login</a></p>
      </div>
    </div>
  `,
})
export class RegisterComponent {
  private auth = inject(AuthService);
  username = ''; email = ''; password = '';
  loading = signal(false); error = signal(''); success = signal(false);

  async doRegister() {
    if (!this.username || !this.email || !this.password) { this.error.set('Please fill all fields'); return; }
    if (this.password.length < 6) { this.error.set('Password must be at least 6 characters'); return; }
    this.loading.set(true); this.error.set('');
    try { await this.auth.register(this.username, this.email, this.password); this.success.set(true); }
    catch (e: unknown) { this.error.set((e as Error).message || 'Registration failed'); }
    finally { this.loading.set(false); }
  }
}
