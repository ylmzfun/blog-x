import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="container" style="padding-top:1.5rem;max-width:600px;">
      @if (loading()) {
        <div class="loading">Loading...</div>
      } @else {
        <div class="card mb-md">
          <h2 style="font-size:1.3rem;margin-bottom:1rem;">Profile</h2>
          @if (successMsg()) { <div class="alert alert-success">{{ successMsg() }}</div> }
          @if (errorMsg()) { <div class="alert alert-error">{{ errorMsg() }}</div> }
          <div class="form-group">
            <label>Username</label>
            <input class="form-input" type="text" [(ngModel)]="username" />
          </div>
          <div class="form-group">
            <label>Bio</label>
            <textarea class="form-input" [(ngModel)]="bio" rows="3" placeholder="Tell us about yourself..."></textarea>
          </div>
          <div class="form-group">
            <label>Website</label>
            <input class="form-input" type="text" [(ngModel)]="website" placeholder="https://..." />
          </div>
          <div class="form-group">
            <label>Avatar</label>
            @if (userAvatar()) {
              <img [src]="userAvatar()" alt="Avatar" style="width:80px;height:80px;border-radius:50%;object-fit:cover;margin-bottom:0.5rem;" />
            }
            <input type="file" accept="image/*" (change)="onAvatarChange($event)" />
          </div>
          <button class="btn btn-primary" (click)="saveProfile()" [disabled]="saving()">
            {{ saving() ? 'Saving...' : 'Save' }}
          </button>
        </div>

        <div class="card">
          <h2 style="font-size:1.3rem;margin-bottom:1rem;">Change Password</h2>
          @if (pwdSuccess()) { <div class="alert alert-success">{{ pwdSuccess() }}</div> }
          @if (pwdError()) { <div class="alert alert-error">{{ pwdError() }}</div> }
          <div class="form-group">
            <label>Old Password</label>
            <input class="form-input" type="password" [(ngModel)]="oldPassword" />
          </div>
          <div class="form-group">
            <label>New Password</label>
            <input class="form-input" type="password" [(ngModel)]="newPassword" />
          </div>
          <button class="btn btn-primary" (click)="changePassword()" [disabled]="changingPwd()">
            {{ changingPwd() ? 'Changing...' : 'Change Password' }}
          </button>
        </div>
      }
    </div>
  `,
})
export class ProfileComponent implements OnInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  userAvatar = signal<string | null>(null);
  loading = signal(true); saving = signal(false);
  successMsg = signal(''); errorMsg = signal('');
  username = ''; bio = ''; website = '';
  oldPassword = ''; newPassword = '';
  changingPwd = signal(false); pwdSuccess = signal(''); pwdError = signal('');

  ngOnInit() {
    this.auth.fetchProfile();
    const u = this.auth.user();
    this.userAvatar.set(u?.avatar ?? null);
    this.username = u?.username ?? '';
    this.bio = u?.bio ?? '';
    this.website = u?.website ?? '';
    this.loading.set(false);
  }

  onAvatarChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files?.[0]) {
      this.api.uploadAvatar(input.files[0]).subscribe({
        next: (res) => {
          if (res.code === 0) { this.auth.fetchProfile(); this.successMsg.set('Avatar updated'); }
        },
      });
    }
  }

  saveProfile() {
    this.saving.set(true); this.successMsg.set(''); this.errorMsg.set('');
    this.api.updateMe({ username: this.username, bio: this.bio, website: this.website }).subscribe({
      next: (res) => {
        if (res.code === 0) { this.auth.fetchProfile(); this.successMsg.set('Profile updated'); }
        else this.errorMsg.set(res.message);
        this.saving.set(false);
      },
      error: () => { this.errorMsg.set('Failed to update profile'); this.saving.set(false); },
    });
  }

  changePassword() {
    if (!this.oldPassword || !this.newPassword) { this.pwdError.set('Please fill both fields'); return; }
    this.changingPwd.set(true); this.pwdSuccess.set(''); this.pwdError.set('');
    this.api.changePassword({ old_password: this.oldPassword, new_password: this.newPassword }).subscribe({
      next: (res) => {
        if (res.code === 0) { this.pwdSuccess.set('Password changed'); this.oldPassword = ''; this.newPassword = ''; }
        else this.pwdError.set(res.message);
        this.changingPwd.set(false);
      },
      error: () => { this.pwdError.set('Failed to change password'); this.changingPwd.set(false); },
    });
  }
}
