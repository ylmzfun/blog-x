<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import type { Post } from '@/types'
import { postApi } from '@/api'

const route = useRoute()
const posts = ref<Post[]>([])
const total = ref(0)
const page = ref(1)
const loading = ref(true)

async function fetch() {
  loading.value = true
  const slug = route.params.slug as string
  const res = await postApi.list({ tag: slug, page: String(page.value), pageSize: '10' })
  if (res.code === 0 && res.data) {
    posts.value = res.data.list as Post[]
    total.value = res.data.total
  }
  loading.value = false
}

onMounted(fetch)
watch(page, () => fetch())
watch(() => route.params.slug, () => { page.value = 1; fetch() })
</script>

<template>
  <div>
    <h1 class="page-title">Tag: {{ route.params.slug }}</h1>

    <div v-if="loading" class="empty">Loading...</div>
    <template v-else>
      <article v-for="post in posts" :key="post.id" class="card">
        <RouterLink :to="`/post/${post.slug}`" style="font-size:20px;font-weight:600;color:#1f2937">{{ post.title }}</RouterLink>
        <p v-if="post.summary" style="color:#666;font-size:14px;margin-top:4px">{{ post.summary }}</p>
        <div class="post-meta" style="margin-top:8px">
          <span v-if="post.author">by {{ post.author.username }}</span>
          <span>{{ new Date(post.publishedAt || post.createdAt).toLocaleDateString() }}</span>
        </div>
      </article>
      <div v-if="total > 10" class="pagination">
        <button class="btn btn-secondary" :disabled="page <= 1" @click="page--">Prev</button>
        <span class="page-info">{{ page }} / {{ Math.ceil(total / 10) }}</span>
        <button class="btn btn-secondary" :disabled="page >= Math.ceil(total / 10)" @click="page++">Next</button>
      </div>
      <div v-if="!posts.length && !loading" class="empty">No posts with this tag.</div>
    </template>
  </div>
</template>

<style scoped>
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-top: 20px;
}
.page-info {
  font-size: 14px;
  color: #666;
}
</style>
