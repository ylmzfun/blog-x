<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { userApi, uploadApi } from '@/api'
import { useAuthStore } from '@/stores/auth'
import type { User } from '@/types'

const auth = useAuthStore()

const bio = ref('')
const website = ref('')
const success = ref('')
const error = ref('')
const loading = ref(false)

// Password change
const oldPassword = ref('')
const newPassword = ref('')
const pwSuccess = ref('')
const pwError = ref('')

onMounted(async () => {
  const res = await userApi.getMe()
  if (res.code === 0 && res.data) {
    const u = res.data as User
    bio.value = u.bio || ''
    website.value = u.website || ''
  }
})

async function updateProfile() {
  error.value = ''
  success.value = ''
  loading.value = true
  const res = await userApi.updateMe({ bio: bio.value, website: website.value })
  loading.value = false
  if (res.code === 0) {
    success.value = 'Profile updated.'
  } else {
    error.value = res.message
  }
}

async function changePassword() {
  pwError.value = ''
  pwSuccess.value = ''
  if (!oldPassword.value || !newPassword.value) {
    pwError.value = 'Please fill in all fields.'
    return
  }
  const res = await userApi.updatePassword({
    oldPassword: oldPassword.value,
    newPassword: newPassword.value,
  })
  if (res.code === 0) {
    pwSuccess.value = 'Password changed.'
    oldPassword.value = ''
    newPassword.value = ''
  } else {
    pwError.value = res.message
  }
}

async function uploadAvatar(e: Event) {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return
  const res = await userApi.uploadAvatar(file)
  if (res.code === 0 && res.data) {
    if (auth.user) {
      auth.user.avatar = res.data.url
    }
    success.value = 'Avatar updated.'
  }
}
</script>

<template>
  <div>
    <h1 class="page-title">Profile</h1>

    <div v-if="auth.user" class="card" style="max-width:600px">
      <div style="display:flex;align-items:center;gap:16px;margin-bottom:20px">
        <img
          :src="auth.user.avatar || 'https://via.placeholder.com/80'"
          alt="avatar"
          style="width:80px;height:80px;border-radius:50%;object-fit:cover"
        />
        <div>
          <h2>{{ auth.user.username }}</h2>
          <p style="color:#999;font-size:14px">{{ auth.user.email }}</p>
          <p style="font-size:13px;color:#666">{{ auth.user.role }}</p>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Upload Avatar</label>
        <input type="file" accept="image/*" @change="uploadAvatar" />
      </div>

      <div v-if="success" class="alert alert-success">{{ success }}</div>
      <div v-if="error" class="alert alert-error">{{ error }}</div>

      <div class="form-group">
        <label class="form-label">Bio</label>
        <textarea v-model="bio" class="form-textarea" rows="3" placeholder="About yourself..."></textarea>
      </div>
      <div class="form-group">
        <label class="form-label">Website</label>
        <input v-model="website" class="form-input" type="url" placeholder="https://..." />
      </div>
      <button class="btn btn-primary" @click="updateProfile" :disabled="loading">Save Profile</button>
    </div>

    <div class="card" style="max-width:600px;margin-top:20px">
      <h3 style="margin-bottom:12px">Change Password</h3>
      <div v-if="pwSuccess" class="alert alert-success">{{ pwSuccess }}</div>
      <div v-if="pwError" class="alert alert-error">{{ pwError }}</div>
      <div class="form-group">
        <label class="form-label">Current Password</label>
        <input v-model="oldPassword" class="form-input" type="password" />
      </div>
      <div class="form-group">
        <label class="form-label">New Password</label>
        <input v-model="newPassword" class="form-input" type="password" />
      </div>
      <button class="btn btn-primary" @click="changePassword">Change Password</button>
    </div>
  </div>
</template>
