<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()

const username = ref('')
const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

async function handleSubmit() {
  error.value = ''
  if (!username.value || !email.value || !password.value) {
    error.value = 'Please fill in all fields.'
    return
  }
  if (password.value.length < 6) {
    error.value = 'Password must be at least 6 characters.'
    return
  }
  loading.value = true
  const result = await auth.register(username.value, email.value, password.value)
  loading.value = false
  if (result.success) {
    router.push('/login')
  } else {
    error.value = result.message || 'Registration failed.'
  }
}
</script>

<template>
  <div class="auth-page">
    <div class="card auth-card">
      <h1 class="page-title" style="text-align:center">Register</h1>

      <div v-if="error" class="alert alert-error">{{ error }}</div>

      <form @submit.prevent="handleSubmit">
        <div class="form-group">
          <label class="form-label">Username</label>
          <input v-model="username" class="form-input" type="text" placeholder="username" />
        </div>
        <div class="form-group">
          <label class="form-label">Email</label>
          <input v-model="email" class="form-input" type="email" placeholder="email" />
        </div>
        <div class="form-group">
          <label class="form-label">Password</label>
          <input v-model="password" class="form-input" type="password" placeholder="at least 6 characters" />
        </div>
        <button class="btn btn-primary" style="width:100%" :disabled="loading">
          {{ loading ? 'Registering...' : 'Register' }}
        </button>
      </form>

      <p style="text-align:center;margin-top:16px;font-size:14px">
        Already have an account?
        <RouterLink to="/login">Login</RouterLink>
      </p>
    </div>
  </div>
</template>

<style scoped>
.auth-page {
  display: flex;
  justify-content: center;
  padding-top: 48px;
}
.auth-card {
  width: 100%;
  max-width: 400px;
}
</style>
