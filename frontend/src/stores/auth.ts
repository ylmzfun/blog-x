import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi, clearTokens, setTokens } from '@/api'

interface User {
  id: number
  username: string
  email: string
  avatar: string
  bio: string
  role: 'admin' | 'author' | 'user'
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const loading = ref(false)

  const isLoggedIn = computed(() => !!user.value)
  const isAdmin = computed(() => user.value?.role === 'admin')
  const isAuthor = computed(() => user.value?.role === 'author' || user.value?.role === 'admin')

  function setUser(u: User | null) {
    user.value = u
    if (u) {
      localStorage.setItem('user', JSON.stringify(u))
    } else {
      localStorage.removeItem('user')
    }
  }

  function loadFromStorage() {
    const stored = localStorage.getItem('user')
    if (stored) {
      try {
        user.value = JSON.parse(stored)
      } catch {
        localStorage.removeItem('user')
      }
    }
  }

  async function login(login: string, password: string) {
    loading.value = true
    try {
      const res = await authApi.login({ login, password })
      if (res.code === 0 && res.data) {
        setTokens(res.data.accessToken, res.data.refreshToken)
        setUser(res.data.user as User)
        return { success: true }
      }
      return { success: false, message: res.message }
    } finally {
      loading.value = false
    }
  }

  async function register(username: string, email: string, password: string) {
    loading.value = true
    try {
      const res = await authApi.register({ username, email, password })
      if (res.code === 0) {
        return { success: true }
      }
      return { success: false, message: res.message }
    } finally {
      loading.value = false
    }
  }

  async function logout() {
    try {
      await authApi.logout()
    } catch {
      // ignore
    }
    clearTokens()
    setUser(null)
  }

  async function fetchMe() {
    const { userApi } = await import('@/api')
    const me = await userApi.getMe()
    if (me.code === 0 && me.data) {
      setUser(me.data as User)
    }
  }

  loadFromStorage()

  return { user, loading, isLoggedIn, isAdmin, isAuthor, login, register, logout, fetchMe, setUser }
})
