<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { postApi, commentApi } from '@/api'
import type { Comment, Post } from '@/types'

const posts = ref<Post[]>([])
const selectedPostId = ref<number | null>(null)
const comments = ref<Comment[]>([])
const loading = ref(false)

onMounted(async () => {
  const res = await postApi.list({ pageSize: '100', status: 'published' })
  if (res.code === 0 && res.data) {
    posts.value = res.data.list as Post[]
  }
})

async function fetchComments() {
  if (!selectedPostId.value) return
  loading.value = true
  const res = await commentApi.list(selectedPostId.value, { pageSize: '100' })
  if (res.code === 0 && res.data) {
    comments.value = res.data.list as Comment[]
  }
  loading.value = false
}

async function approveComment(id: number) {
  await commentApi.approve(id)
  await fetchComments()
}

async function deleteComment(id: number) {
  if (!confirm('Delete this comment?')) return
  await commentApi.delete(id)
  await fetchComments()
}
</script>

<template>
  <div>
    <h1 class="page-title">Comments</h1>

    <div style="margin-bottom:16px">
      <label class="form-label">Filter by Post</label>
      <select v-model="selectedPostId" class="form-select" style="width:auto" @change="fetchComments">
        <option :value="null">Select a post...</option>
        <option v-for="p in posts" :key="p.id" :value="p.id">{{ p.title }}</option>
      </select>
    </div>

    <div v-if="!selectedPostId" class="empty">Select a post to view comments.</div>

    <div v-else-if="loading" class="empty">Loading...</div>

    <template v-else>
      <div v-if="!comments.length" class="empty">No comments on this post.</div>

      <div v-for="c in comments" :key="c.id" class="card" style="max-width:700px">
        <div style="display:flex;justify-content:space-between;align-items:start">
          <div>
            <strong>{{ c.author?.username || 'User #' + c.authorId }}</strong>
            <span style="color:#999;font-size:12px;margin-left:8px">
              {{ new Date(c.createdAt).toLocaleString() }}
            </span>
            <span :class="c.status === 'approved' ? 'badge-green' : c.status === 'pending' ? 'badge-yellow' : 'badge-red'" style="margin-left:8px">
              {{ c.status }}
            </span>
          </div>
          <div class="actions">
            <button v-if="c.status !== 'approved'" class="btn btn-secondary btn-sm" @click="approveComment(c.id)">Approve</button>
            <button class="btn btn-danger btn-sm" @click="deleteComment(c.id)">Delete</button>
          </div>
        </div>
        <p style="margin-top:8px;font-size:14px;white-space:pre-wrap">{{ c.content }}</p>
      </div>
    </template>
  </div>
</template>

<style scoped>
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
  font-size: 11px;
  font-weight: 500;
}
.badge-yellow {
  display: inline-block;
  padding: 2px 8px;
  background: #fef9c3;
  color: #ca8a04;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 500;
}
.badge-red {
  display: inline-block;
  padding: 2px 8px;
  background: #fef2f2;
  color: #dc2626;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 500;
}
</style>
