<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import type { Post, Category, Tag } from '@/types'
import { postApi, categoryApi, tagApi } from '@/api'

const posts = ref<Post[]>([])
const categories = ref<Category[]>([])
const tags = ref<Tag[]>([])
const total = ref(0)
const page = ref(1)
const loading = ref(true)

async function fetchPosts() {
  loading.value = true
  const res = await postApi.list({ page: String(page.value), pageSize: '10', sort: 'latest' })
  if (res.code === 0 && res.data) {
    posts.value = res.data.list as Post[]
    total.value = res.data.total
  }
  loading.value = false
}

onMounted(async () => {
  await fetchPosts()
  const [catRes, tagRes] = await Promise.all([categoryApi.list(), tagApi.list()])
  if (catRes.code === 0 && Array.isArray(catRes.data)) categories.value = catRes.data as Category[]
  if (tagRes.code === 0 && Array.isArray(tagRes.data)) tags.value = tagRes.data as Tag[]
})

watch(page, () => fetchPosts())

function totalPages() {
  return Math.ceil(total.value / 10)
}
</script>

<template>
  <div class="home">
    <div class="content">
      <h1 class="page-title">Latest Posts</h1>

      <div v-if="loading" class="empty">Loading...</div>

      <template v-else-if="posts.length">
        <article v-for="post in posts" :key="post.id" class="card post-card">
          <div class="post-card-body">
            <RouterLink :to="`/post/${post.slug}`" class="post-title">{{ post.title }}</RouterLink>
            <p v-if="post.summary" class="post-summary">{{ post.summary }}</p>
            <div class="post-meta">
              <span v-if="post.author">by {{ post.author.username }}</span>
              <span v-if="post.publishedAt">{{ new Date(post.publishedAt).toLocaleDateString() }}</span>
              <span v-if="post.category">
                in
                <RouterLink :to="`/category/${post.category.slug}`">{{ post.category.name }}</RouterLink>
              </span>
              <span>{{ post.viewCount }} views</span>
              <span>{{ post.commentCount }} comments</span>
            </div>
            <div v-if="post.tags?.length" class="post-tags">
              <RouterLink
                v-for="tag in post.tags"
                :key="tag.id"
                :to="`/tag/${tag.slug}`"
                class="tag"
              >{{ tag.name }}</RouterLink>
            </div>
          </div>
        </article>

        <div class="pagination" v-if="totalPages() > 1">
          <button
            class="btn btn-secondary"
            :disabled="page <= 1"
            @click="page--"
          >Prev</button>
          <span class="page-info">{{ page }} / {{ totalPages() }}</span>
          <button
            class="btn btn-secondary"
            :disabled="page >= totalPages()"
            @click="page++"
          >Next</button>
        </div>
      </template>

      <div v-else class="empty">No posts yet.</div>
    </div>

    <aside class="sidebar">
      <div class="card">
        <h3>Categories</h3>
        <ul class="sidebar-list">
          <li v-for="cat in categories" :key="cat.id">
            <RouterLink :to="`/category/${cat.slug}`">
              {{ cat.name }} ({{ cat.postCount }})
            </RouterLink>
          </li>
        </ul>
        <div v-if="!categories.length" style="padding:16px;color:#999;font-size:14px">No categories</div>
      </div>

      <div class="card">
        <h3>Tags</h3>
        <div class="tag-cloud">
          <RouterLink
            v-for="tag in tags"
            :key="tag.id"
            :to="`/tag/${tag.slug}`"
            class="tag"
          >{{ tag.name }} ({{ tag.postCount }})</RouterLink>
          <div v-if="!tags.length" style="padding:16px;color:#999;font-size:14px">No tags</div>
        </div>
      </div>
    </aside>
  </div>
</template>

<style scoped>
.home {
  display: flex;
  gap: 24px;
}
.content {
  flex: 1;
  min-width: 0;
}
.sidebar {
  width: 280px;
  flex-shrink: 0;
}
.sidebar h3 {
  font-size: 16px;
  margin-bottom: 12px;
}
.sidebar-list {
  list-style: none;
}
.sidebar-list li {
  padding: 4px 0;
}
.tag-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.post-card {
  transition: box-shadow 0.2s;
}
.post-card:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
}
.post-title {
  font-size: 20px;
  font-weight: 600;
  color: #1f2937;
  display: block;
  margin-bottom: 8px;
}
.post-title:hover {
  color: #2563eb;
  text-decoration: none;
}
.post-summary {
  color: #666;
  font-size: 14px;
  margin-bottom: 10px;
}
.post-meta {
  font-size: 13px;
  color: #999;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.post-meta a {
  color: #2563eb;
}
.post-tags {
  margin-top: 8px;
}
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
@media (max-width: 768px) {
  .home {
    flex-direction: column;
  }
  .sidebar {
    width: 100%;
  }
}
</style>
