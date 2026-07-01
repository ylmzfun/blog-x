import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/views/HomeView.vue'),
    },
    {
      path: '/post/:slug',
      name: 'post',
      component: () => import('@/views/PostView.vue'),
    },
    {
      path: '/category/:slug',
      name: 'category',
      component: () => import('@/views/CategoryView.vue'),
    },
    {
      path: '/tag/:slug',
      name: 'tag',
      component: () => import('@/views/TagView.vue'),
    },
    {
      path: '/search',
      name: 'search',
      component: () => import('@/views/SearchView.vue'),
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
      meta: { guest: true },
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('@/views/RegisterView.vue'),
      meta: { guest: true },
    },
    {
      path: '/profile',
      name: 'profile',
      component: () => import('@/views/ProfileView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/admin',
      component: () => import('@/views/admin/AdminLayout.vue'),
      meta: { requiresAuth: true, requiresAdmin: true },
      children: [
        {
          path: '',
          name: 'admin-dashboard',
          component: () => import('@/views/admin/DashboardView.vue'),
        },
        {
          path: 'posts',
          name: 'admin-posts',
          component: () => import('@/views/admin/PostsView.vue'),
        },
        {
          path: 'posts/new',
          name: 'admin-post-new',
          component: () => import('@/views/admin/PostEditView.vue'),
        },
        {
          path: 'posts/:id/edit',
          name: 'admin-post-edit',
          component: () => import('@/views/admin/PostEditView.vue'),
        },
        {
          path: 'categories',
          name: 'admin-categories',
          component: () => import('@/views/admin/CategoriesView.vue'),
        },
        {
          path: 'comments',
          name: 'admin-comments',
          component: () => import('@/views/admin/CommentsView.vue'),
        },
        {
          path: 'stats',
          name: 'admin-stats',
          component: () => import('@/views/admin/StatsView.vue'),
        },
      ],
    },
  ],
})

router.beforeEach((to, _from, next) => {
  const auth = useAuthStore()

  if (to.meta.requiresAuth && !auth.isLoggedIn) {
    return next('/login')
  }
  if (to.meta.requiresAdmin && !auth.isAdmin) {
    return next('/')
  }
  if (to.meta.guest && auth.isLoggedIn) {
    return next('/')
  }
  next()
})

export default router
