<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()

function handleLogout() {
  auth.logout()
  router.push('/')
}
</script>

<template>
  <nav class="navbar">
    <div class="navbar-inner">
      <RouterLink to="/" class="brand">BlogX</RouterLink>

      <div class="nav-links">
        <RouterLink to="/search" class="nav-link">Search</RouterLink>

        <template v-if="auth.isLoggedIn">
          <RouterLink to="/profile" class="nav-link">Profile</RouterLink>
          <RouterLink v-if="auth.isAdmin" to="/admin" class="nav-link">Admin</RouterLink>
          <button class="btn btn-secondary btn-sm" @click="handleLogout">Logout</button>
        </template>
        <template v-else>
          <RouterLink to="/login" class="nav-link">Login</RouterLink>
          <RouterLink to="/register" class="btn btn-primary btn-sm">Register</RouterLink>
        </template>
      </div>
    </div>
  </nav>
</template>

<style scoped>
.navbar {
  background: #fff;
  border-bottom: 1px solid #eee;
  position: sticky;
  top: 0;
  z-index: 100;
}
.navbar-inner {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  height: 56px;
}
.brand {
  font-size: 22px;
  font-weight: 800;
  color: #2563eb;
}
.nav-links {
  display: flex;
  align-items: center;
  gap: 12px;
}
.nav-link {
  color: #555;
  font-size: 14px;
  padding: 4px 8px;
}
.nav-link:hover {
  color: #2563eb;
  text-decoration: none;
}
.btn-sm {
  padding: 6px 14px;
  font-size: 13px;
}
</style>
