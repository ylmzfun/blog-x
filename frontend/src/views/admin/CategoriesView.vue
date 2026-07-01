<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { categoryApi } from '@/api'
import type { Category } from '@/types'

const categories = ref<Category[]>([])
const loading = ref(true)

// form
const name = ref('')
const slug = ref('')
const description = ref('')
const editId = ref<number | null>(null)

onMounted(async () => {
  await fetchCategories()
})

async function fetchCategories() {
  loading.value = true
  const res = await categoryApi.list()
  if (res.code === 0 && Array.isArray(res.data)) {
    categories.value = res.data as Category[]
  }
  loading.value = false
}

async function save() {
  if (!name.value || !slug.value) return
  if (editId.value) {
    await categoryApi.update(editId.value, {
      name: name.value,
      slug: slug.value,
      description: description.value,
    })
  } else {
    await categoryApi.create({
      name: name.value,
      slug: slug.value,
      description: description.value,
    })
  }
  name.value = ''
  slug.value = ''
  description.value = ''
  editId.value = null
  await fetchCategories()
}

async function remove(id: number) {
  if (!confirm('Delete this category?')) return
  await categoryApi.delete(id)
  await fetchCategories()
}

function edit(cat: Category) {
  editId.value = cat.id
  name.value = cat.name
  slug.value = cat.slug
  description.value = cat.description
}
</script>

<template>
  <div>
    <h1 class="page-title">Categories</h1>

    <div class="card" style="max-width:600px;margin-bottom:24px">
      <h3 style="margin-bottom:12px">{{ editId ? 'Edit Category' : 'New Category' }}</h3>
      <div class="form-group">
        <label class="form-label">Name</label>
        <input v-model="name" class="form-input" type="text" placeholder="Category name" />
      </div>
      <div class="form-group">
        <label class="form-label">Slug</label>
        <input v-model="slug" class="form-input" type="text" placeholder="category-slug" />
      </div>
      <div class="form-group">
        <label class="form-label">Description</label>
        <input v-model="description" class="form-input" type="text" placeholder="Optional description" />
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-primary" @click="save">{{ editId ? 'Update' : 'Create' }}</button>
        <button v-if="editId" class="btn btn-secondary" @click="editId = null; name = ''; slug = ''; description = ''">Cancel</button>
      </div>
    </div>

    <div v-if="loading" class="empty">Loading...</div>

    <table class="table" v-else-if="categories.length">
      <thead>
        <tr><th>Name</th><th>Slug</th><th>Posts</th><th>Description</th><th>Actions</th></tr>
      </thead>
      <tbody>
        <tr v-for="cat in categories" :key="cat.id">
          <td><strong>{{ cat.name }}</strong></td>
          <td>{{ cat.slug }}</td>
          <td>{{ cat.postCount }}</td>
          <td>{{ cat.description || '-' }}</td>
          <td class="actions">
            <button class="btn btn-secondary btn-sm" @click="edit(cat)">Edit</button>
            <button class="btn btn-danger btn-sm" @click="remove(cat.id)">Delete</button>
          </td>
        </tr>
      </tbody>
    </table>

    <div v-else class="empty">No categories.</div>
  </div>
</template>

<style scoped>
.table {
  width: 100%;
  border-collapse: collapse;
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0,0,0,0.08);
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
</style>
