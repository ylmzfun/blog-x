<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()

const login = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

async function handleSubmit() {
  error.value = ''
  if (!login.value || !password.value) {
    error.value = 'Please fill in all fields.'
    return
  }
  loading.value = true
  const result = await auth.login(login.value, password.value)
  loading.value = false
  if (result.success) {
    router.push('/')
  } else {
    error.value = result.message || 'Login failed.'
  }
}
</script>

<template>
  <div class="auth-page">
    <div class="card auth-card">
      <h1 class="page-title" style="text-align:center">Login</h1>

      <div v-if="error" class="alert alert-error">{{ error }}</div>

      <form @submit.prevent="handleSubmit">
        <div class="form-group">
          <label class="form-label">Email or Username</label>
          <input v-model="login" class="form-input" type="text" placeholder="email or username" />
        </div>
        <div class="form-group">
          <label class="form-label">Password</label>
          <input v-model="password" class="form-input" type="password" placeholder="password" />
        </div>
        <button class="btn btn-primary" style="width:100%" :disabled="loading">
          {{ loading ? 'Logging in...' : 'Login' }}
        </button>
      </form>

      <p style="text-align:center;margin-top:16px;font-size:14px">
        Don't have an account?
        <RouterLink to="/register">Register</RouterLink>
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
