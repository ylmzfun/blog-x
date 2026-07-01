<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { postApi, categoryApi, uploadApi } from '@/api'
import type { Category } from '@/types'

const route = useRoute()
const router = useRouter()
const isEdit = route.name === 'admin-post-edit'

const title = ref('')
const content = ref('')
const summary = ref('')
const cover = ref('')
const categoryId = ref<number | null>(null)
const postStatus = ref<'published' | 'draft'>('draft')
const tagsInput = ref('')
const categories = ref<Category[]>([])
const loading = ref(false)
const error = ref('')

onMounted(async () => {
  const catRes = await categoryApi.list()
  if (catRes.code === 0 && Array.isArray(catRes.data)) categories.value = catRes.data as Category[]

  if (isEdit) {
    const id = route.params.id as string
    const res = await postApi.list({}) // fetch post by id would be better, but we use list
    // For edit, we'd ideally fetch the single post. Using a workaround:
    const allRes = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8080/api'}/posts?pageSize=50&status=`)
    const data = await allRes.json()
    if (data.code === 0 && data.data) {
      const post = data.data.list?.find((p: Record<string, unknown>) => String(p.id) === id)
      if (post) {
        title.value = post.title as string
        content.value = post.content as string || ''
        summary.value = post.summary as string || ''
        cover.value = post.cover as string || ''
        categoryId.value = post.categoryId as number | null
        postStatus.value = post.status as 'published' | 'draft'
        tagsInput.value = ((post.tags as { name: string }[] | undefined) || []).map((t: { name: string }) => t.name).join(', ')
      }
    }
  }
})

async function save() {
  error.value = ''
  if (!title.value.trim()) {
    error.value = 'Title is required.'
    return
  }
  const tags = tagsInput.value.split(',').map(t => t.trim()).filter(Boolean)
  const payload = {
    title: title.value,
    content: content.value,
    summary: summary.value,
    cover: cover.value,
    categoryId: categoryId.value || null,
    status: postStatus.value,
    tags,
  }

  loading.value = true
  let res
  if (isEdit) {
    const id = Number(route.params.id)
    res = await postApi.update(id, payload)
  } else {
    res = await postApi.create(payload)
  }
  loading.value = false

  if (res.code === 0) {
    router.push('/admin/posts')
  } else {
    error.value = res.message
  }
}

async function uploadCoverImage(e: Event) {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return
  const res = await uploadApi.image(file)
  if (res.code === 0 && res.data) {
    cover.value = res.data.url
  }
}
</script>

<template>
  <div>
    <h1 class="page-title">{{ isEdit ? 'Edit Post' : 'New Post' }}</h1>

    <div v-if="error" class="alert alert-error">{{ error }}</div>

    <div class="card" style="max-width:800px">
      <div class="form-group">
        <label class="form-label">Title *</label>
        <input v-model="title" class="form-input" type="text" placeholder="Post title" />
      </div>

      <div class="form-group">
        <label class="form-label">Content (Markdown)</label>
        <textarea v-model="content" class="form-textarea" rows="12" placeholder="Write your post in Markdown..."></textarea>
      </div>

      <div class="form-group">
        <label class="form-label">Summary</label>
        <textarea v-model="summary" class="form-textarea" rows="2" placeholder="Brief summary..."></textarea>
      </div>

      <div class="form-group">
        <label class="form-label">Cover Image</label>
        <input v-model="cover" class="form-input" type="url" placeholder="Image URL or upload" />
        <div style="margin-top:8px">
          <input type="file" accept="image/*" @change="uploadCoverImage" />
        </div>
        <img v-if="cover" :src="cover" alt="cover preview" style="max-width:200px;margin-top:8px;border-radius:4px" />
      </div>

      <div style="display:flex;gap:16px">
        <div class="form-group" style="flex:1">
          <label class="form-label">Category</label>
          <select v-model="categoryId" class="form-select">
            <option :value="null">None</option>
            <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
          </select>
        </div>
        <div class="form-group" style="flex:1">
          <label class="form-label">Status</label>
          <select v-model="postStatus" class="form-select">
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Tags (comma separated)</label>
        <input v-model="tagsInput" class="form-input" type="text" placeholder="vue, javascript, tutorial" />
      </div>

      <div style="display:flex;gap:8px;margin-top:16px">
        <button class="btn btn-primary" @click="save" :disabled="loading">
          {{ loading ? 'Saving...' : 'Save' }}
        </button>
        <button class="btn btn-secondary" @click="router.back()">Cancel</button>
      </div>
    </div>
  </div>
</template>
