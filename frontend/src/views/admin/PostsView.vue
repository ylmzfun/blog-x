<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { postApi } from '@/api'
import type { Post } from '@/types'

const router = useRouter()

const posts = ref<Post[]>([])
const total = ref(0)
const page = ref(1)
const status = ref('')
const loading = ref(true)

async function fetchPosts() {
  loading.value = true
  const params: Record<string, string> = { page: String(page.value), pageSize: '10' }
  if (status.value) params.status = status.value
  const res = await postApi.list(params)
  if (res.code === 0 && res.data) {
    posts.value = res.data.list as Post[]
    total.value = res.data.total
  }
  loading.value = false
}

onMounted(fetchPosts)
watch([page, status], () => fetchPosts())

async function deletePost(id: number) {
  if (!confirm('Delete this post?')) return
  const res = await postApi.delete(id)
  if (res.code === 0) await fetchPosts()
}

async function togglePin(post: Post) {
  const res = await postApi.pin(post.id)
  if (res.code === 0) await fetchPosts()
}
</script>

<template>
  <div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
      <h1 class="page-title" style="margin-bottom:0">Posts</h1>
      <button class="btn btn-primary" @click="router.push('/admin/posts/new')">New Post</button>
    </div>

    <div style="margin-bottom:16px">
      <select v-model="status" class="form-select" style="width:auto">
        <option value="">All Status</option>
        <option value="published">Published</option>
        <option value="draft">Draft</option>
      </select>
    </div>

    <div v-if="loading" class="empty">Loading...</div>

    <table class="table" v-else-if="posts.length">
      <thead>
        <tr>
          <th>Title</th>
          <th>Status</th>
          <th>Category</th>
          <th>Views</th>
          <th>Comments</th>
          <th>Created</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="post in posts" :key="post.id">
          <td>
            <span v-if="post.pinned" title="Pinned">📌 </span>
            {{ post.title }}
          </td>
          <td><span :class="post.status === 'published' ? 'badge-green' : 'badge-gray'">{{ post.status }}</span></td>
          <td>{{ post.category?.name || '-' }}</td>
          <td>{{ post.viewCount }}</td>
          <td>{{ post.commentCount }}</td>
          <td>{{ new Date(post.createdAt).toLocaleDateString() }}</td>
          <td class="actions">
            <button class="btn btn-secondary btn-sm" @click="router.push(`/admin/posts/${post.id}/edit`)">Edit</button>
            <button class="btn btn-secondary btn-sm" @click="togglePin(post)">{{ post.pinned ? 'Unpin' : 'Pin' }}</button>
            <button class="btn btn-danger btn-sm" @click="deletePost(post.id)">Delete</button>
          </td>
        </tr>
      </tbody>
    </table>

    <div v-else class="empty">No posts found.</div>

    <div v-if="total > 10" class="pagination" style="margin-top:16px">
      <button class="btn btn-secondary" :disabled="page <= 1" @click="page--">Prev</button>
      <span class="page-info">{{ page }} / {{ Math.ceil(total / 10) }}</span>
      <button class="btn btn-secondary" :disabled="page >= Math.ceil(total / 10)" @click="page++">Next</button>
    </div>
  </div>
</template>

<style scoped>
.table {
  width: 100%;
  border-collapse: collapse;
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}
.table th,
.table td {
  text-align: left;
  padding: 10px 14px;
  border-bottom: 1px solid #eee;
  font-size: 14px;
}
.table th {
  background: #f9fafb;
  font-weight: 600;
  color: #555;
}
.actions {
  display: flex;
  gap: 6px;
}
.btn-sm {
  padding: 4px 10px;
  font-size: 12px;
}
.badge-green {
  display: inline-block;
  padding: 2px 8px;
  background: #dcfce7;
  color: #16a34a;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 500;
}
.badge-gray {
  display: inline-block;
  padding: 2px 8px;
  background: #f3f4f6;
  color: #666;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 500;
}
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}
.page-info {
  font-size: 14px;
  color: #666;
}
</style>
