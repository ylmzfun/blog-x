<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { statsApi } from '@/api'

const overview = ref<Record<string, number>>({})
const topPosts = ref<{ id: number; title: string; viewCount: number }[]>([])

onMounted(async () => {
  const [ov, tp] = await Promise.all([statsApi.overview(), statsApi.topPosts()])
  if (ov.code === 0 && ov.data) overview.value = ov.data as Record<string, number>
  if (tp.code === 0 && Array.isArray(tp.data)) topPosts.value = tp.data as { id: number; title: string; viewCount: number }[]
})
</script>

<template>
  <div>
    <h1 class="page-title">Dashboard</h1>

    <div class="stats-grid">
      <div class="card stat-card">
        <div class="stat-value">{{ overview.postCount ?? 0 }}</div>
        <div class="stat-label">Posts</div>
      </div>
      <div class="card stat-card">
        <div class="stat-value">{{ overview.commentCount ?? 0 }}</div>
        <div class="stat-label">Comments</div>
      </div>
      <div class="card stat-card">
        <div class="stat-value">{{ overview.userCount ?? 0 }}</div>
        <div class="stat-label">Users</div>
      </div>
    </div>

    <div class="card" style="margin-top:24px">
      <h3 style="margin-bottom:12px">Top Posts by Views</h3>
      <table class="table" v-if="topPosts.length">
        <thead>
          <tr><th>Title</th><th>Views</th></tr>
        </thead>
        <tbody>
          <tr v-for="p in topPosts" :key="p.id">
            <td>{{ p.title }}</td>
            <td>{{ p.viewCount }}</td>
          </tr>
        </tbody>
      </table>
      <div v-else class="empty">No data</div>
    </div>
  </div>
</template>

<style scoped>
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 16px;
}
.stat-card {
  text-align: center;
}
.stat-value {
  font-size: 32px;
  font-weight: 700;
  color: #2563eb;
}
.stat-label {
  font-size: 14px;
  color: #999;
  margin-top: 4px;
}
.table {
  width: 100%;
  border-collapse: collapse;
}
.table th,
.table td {
  text-align: left;
  padding: 8px 12px;
  border-bottom: 1px solid #eee;
  font-size: 14px;
}
.table th {
  font-weight: 600;
  color: #555;
}
</style>
