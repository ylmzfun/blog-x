<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { Post } from '@/types'
import { searchApi } from '@/api'

const route = useRoute()
const router = useRouter()

const query = ref((route.query.q as string) || '')
const suggestions = ref<string[]>([])
const posts = ref<Post[]>([])
const total = ref(0)
const page = ref(1)
const loading = ref(false)
const searched = ref(false)

async function doSearch(p?: number) {
  if (!query.value.trim()) return
  page.value = p || 1
  loading.value = true
  searched.value = true
  router.replace({ query: { q: query.value } })
  const res = await searchApi.search(query.value, { page: String(page.value), pageSize: '10' })
  if (res.code === 0 && res.data) {
    posts.value = res.data.list as Post[]
    total.value = res.data.total
  }
  loading.value = false
}

async function fetchSuggestions() {
  if (!query.value.trim()) {
    suggestions.value = []
    return
  }
  const res = await searchApi.suggestions(query.value)
  if (res.code === 0 && Array.isArray(res.data)) {
    suggestions.value = res.data as string[]
  }
}
</script>

<template>
  <div>
    <h1 class="page-title">Search</h1>
    <div class="search-bar">
      <input
        v-model="query"
        class="form-input"
        placeholder="Search articles..."
        @keyup.enter="doSearch()"
        @input="fetchSuggestions"
      />
      <button class="btn btn-primary" @click="doSearch()">Search</button>
    </div>
    <ul v-if="suggestions.length && !searched" class="suggestions">
      <li v-for="s in suggestions" :key="s" @click="query = s; doSearch()">{{ s }}</li>
    </ul>

    <div v-if="loading" class="empty">Searching...</div>
    <template v-else-if="searched">
      <p style="color:#666;margin-bottom:16px">{{ total }} results for "{{ query }}"</p>
      <article v-for="post in posts" :key="post.id" class="card">
        <RouterLink :to="`/post/${post.slug}`" style="font-size:20px;font-weight:600;color:#1f2937">{{ post.title }}</RouterLink>
        <p v-if="post.summary" style="color:#666;font-size:14px;margin-top:4px">{{ post.summary }}</p>
        <div class="post-meta" style="margin-top:8px">
          <span v-if="post.author">by {{ post.author.username }}</span>
          <span>{{ new Date(post.publishedAt || post.createdAt).toLocaleDateString() }}</span>
        </div>
      </article>
      <div v-if="!posts.length" class="empty">No results found.</div>
    </template>
    <div v-else class="empty" style="padding:24px">Enter a keyword to search.</div>
  </div>
</template>

<style scoped>
.search-bar {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}
.search-bar .form-input {
  flex: 1;
}
.suggestions {
  list-style: none;
  background: #fff;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  margin-top: -8px;
  margin-bottom: 16px;
}
.suggestions li {
  padding: 8px 12px;
  cursor: pointer;
  font-size: 14px;
}
.suggestions li:hover {
  background: #f3f4f6;
}
</style>
