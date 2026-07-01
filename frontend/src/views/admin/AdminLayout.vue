<script setup lang="ts">
import { RouterView, RouterLink, useRoute } from 'vue-router'

const route = useRoute()

const links = [
  { to: '/admin', label: 'Dashboard' },
  { to: '/admin/posts', label: 'Posts' },
  { to: '/admin/categories', label: 'Categories' },
  { to: '/admin/comments', label: 'Comments' },
  { to: '/admin/stats', label: 'Stats' },
]
</script>

<template>
  <div class="admin-layout">
    <aside class="admin-sidebar">
      <h2 style="font-size:18px;margin-bottom:16px;padding:0 12px">Admin Panel</h2>
      <nav>
        <RouterLink
          v-for="link in links"
          :key="link.to"
          :to="link.to"
          class="admin-nav-link"
          :class="{ active: route.path === link.to || (link.to !== '/admin' && route.path.startsWith(link.to)) }"
        >{{ link.label }}</RouterLink>
      </nav>
      <div style="padding:12px;margin-top:auto">
        <RouterLink to="/" style="font-size:13px;color:#666">← Back to site</RouterLink>
      </div>
    </aside>
    <main class="admin-main">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.admin-layout {
  display: flex;
  min-height: calc(100vh - 56px - 57px); /* navbar + footer */
}
.admin-sidebar {
  width: 200px;
  background: #fff;
  border-right: 1px solid #eee;
  padding: 20px 0;
  display: flex;
  flex-direction: column;
}
.admin-main {
  flex: 1;
  padding: 24px;
  min-width: 0;
}
.admin-nav-link {
  display: block;
  padding: 8px 16px;
  font-size: 14px;
  color: #555;
  border-left: 3px solid transparent;
  transition: all 0.15s;
}
.admin-nav-link:hover {
  background: #f3f4f6;
  text-decoration: none;
  color: #2563eb;
}
.admin-nav-link.active {
  background: #eff6ff;
  color: #2563eb;
  border-left-color: #2563eb;
  font-weight: 500;
}
@media (max-width: 768px) {
  .admin-layout {
    flex-direction: column;
  }
  .admin-sidebar {
    width: 100%;
    flex-direction: row;
    padding: 8px;
    overflow-x: auto;
    border-right: none;
    border-bottom: 1px solid #eee;
  }
  .admin-sidebar nav {
    display: flex;
  }
  .admin-nav-link {
    border-left: none;
    border-bottom: 3px solid transparent;
    white-space: nowrap;
  }
  .admin-nav-link.active {
    border-left: none;
    border-bottom-color: #2563eb;
  }
}
</style>
