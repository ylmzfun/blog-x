<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import type { Post, Comment } from '@/types'
import { postApi, commentApi } from '@/api'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const auth = useAuthStore()

const post = ref<Post | null>(null)
const comments = ref<Comment[]>([])
const newComment = ref('')
const replyTo = ref<{ id: number; author: string } | null>(null)
const commentPage = ref(1)
const commentTotal = ref(0)
const loading = ref(true)

onMounted(async () => {
  const slug = route.params.slug as string
  const res = await postApi.getBySlug(slug)
  if (res.code === 0 && res.data) {
    post.value = res.data as Post
    if (post.value) {
      await fetchComments()
    }
  }
  loading.value = false
})

async function fetchComments() {
  if (!post.value) return
  const res = await commentApi.list(post.value.id, {
    page: String(commentPage.value),
    pageSize: '10',
  })
  if (res.code === 0 && res.data) {
    comments.value = res.data.list as Comment[]
    commentTotal.value = res.data.total
  }
}

async function submitComment() {
  if (!post.value || !newComment.value.trim()) return
  const res = await commentApi.create({
    postId: post.value.id,
    content: newComment.value,
    parentId: replyTo.value?.id,
  })
  if (res.code === 0) {
    newComment.value = ''
    replyTo.value = null
    await fetchComments()
  }
}

async function deleteComment(id: number) {
  if (!confirm('Delete this comment?')) return
  const res = await commentApi.delete(id)
  if (res.code === 0) {
    await fetchComments()
  }
}

function startReply(comment: Comment) {
  replyTo.value = { id: comment.id, author: comment.author?.username || 'unknown' }
  newComment.value = `@${replyTo.value.author} `
}
</script>

<template>
  <div>
    <div v-if="loading" class="empty">Loading...</div>

    <template v-else-if="post">
      <article class="card">
        <h1 class="post-detail-title">{{ post.title }}</h1>
        <div class="post-meta" style="margin-bottom:20px">
          <span v-if="post.author">by {{ post.author.username }}</span>
          <span v-if="post.publishedAt">{{ new Date(post.publishedAt).toLocaleDateString() }}</span>
          <span v-if="post.category">
            in
            <RouterLink :to="`/category/${post.category.slug}`">{{ post.category.name }}</RouterLink>
          </span>
          <span>{{ post.viewCount }} views</span>
        </div>
        <div v-if="post.cover" style="margin-bottom:16px">
          <img :src="post.cover" alt="cover" style="max-width:100%;border-radius:8px" />
        </div>
        <div class="post-content" v-html="post.content" style="white-space:pre-wrap"></div>
        <div v-if="post.tags?.length" style="margin-top:16px">
          <RouterLink
            v-for="tag in post.tags"
            :key="tag.id"
            :to="`/tag/${tag.slug}`"
            class="tag"
          >{{ tag.name }}</RouterLink>
        </div>
      </article>

      <!-- Comments -->
      <section class="card" style="margin-top:24px">
        <h2 style="font-size:18px;margin-bottom:16px">Comments ({{ post.commentCount }})</h2>

        <div v-if="auth.isLoggedIn" class="comment-form">
          <p v-if="replyTo" class="reply-notice">
            Replying to {{ replyTo.author }}
            <button @click="replyTo = null" style="background:none;border:none;cursor:pointer;color:#999">&times;</button>
          </p>
          <textarea
            v-model="newComment"
            class="form-textarea"
            placeholder="Write a comment..."
            rows="3"
          ></textarea>
          <button class="btn btn-primary" style="margin-top:8px" @click="submitComment" :disabled="!newComment.trim()">
            Submit
          </button>
        </div>
        <p v-else style="color:#999;font-size:14px">
          <RouterLink to="/login">Login</RouterLink> to comment.
        </p>

        <div v-if="!comments.length" class="empty" style="padding:24px">No comments yet.</div>

        <div v-for="c in comments" :key="c.id" class="comment">
          <div class="comment-header">
            <strong>{{ c.author?.username }}</strong>
            <span class="comment-date">{{ new Date(c.createdAt).toLocaleDateString() }}</span>
          </div>
          <p class="comment-body">{{ c.content }}</p>
          <div class="comment-actions">
            <button v-if="auth.isLoggedIn" @click="startReply(c)" class="btn-link">Reply</button>
            <button
              v-if="auth.isLoggedIn && (auth.isAdmin || auth.user?.id === c.authorId)"
              @click="deleteComment(c.id)"
              class="btn-link"
              style="color:#dc2626"
            >Delete</button>
          </div>
          <!-- children -->
          <div v-for="child in c.children" :key="child.id" class="comment child-comment">
            <div class="comment-header">
              <strong>{{ child.author?.username }}</strong>
              <span class="comment-date">{{ new Date(child.createdAt).toLocaleDateString() }}</span>
            </div>
            <p class="comment-body">{{ child.content }}</p>
            <div class="comment-actions">
              <button
                v-if="auth.isLoggedIn && (auth.isAdmin || auth.user?.id === child.authorId)"
                @click="deleteComment(child.id)"
                class="btn-link"
                style="color:#dc2626"
              >Delete</button>
            </div>
          </div>
        </div>

        <div class="pagination" v-if="commentTotal > 10">
          <button class="btn btn-secondary" :disabled="commentPage <= 1" @click="commentPage--; fetchComments()">Prev</button>
          <span class="page-info">{{ commentPage }} / {{ Math.ceil(commentTotal / 10) }}</span>
          <button
            class="btn btn-secondary"
            :disabled="commentPage >= Math.ceil(commentTotal / 10)"
            @click="commentPage++; fetchComments()"
          >Next</button>
        </div>
      </section>
    </template>

    <div v-else class="empty">Post not found.</div>
  </div>
</template>

<style scoped>
.post-detail-title {
  font-size: 32px;
  font-weight: 700;
  margin-bottom: 12px;
  color: #1f2937;
}
.post-meta {
  font-size: 13px;
  color: #999;
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}
.post-content {
  line-height: 1.8;
  font-size: 15px;
}
.comment {
  padding: 12px 0;
  border-bottom: 1px solid #f0f0f0;
}
.child-comment {
  margin-left: 24px;
  border-bottom: none;
  padding-left: 12px;
  border-left: 2px solid #e5e7eb;
}
.comment-header {
  display: flex;
  gap: 8px;
  align-items: baseline;
}
.comment-date {
  font-size: 12px;
  color: #999;
}
.comment-body {
  margin: 6px 0;
  font-size: 14px;
}
.comment-actions {
  display: flex;
  gap: 8px;
}
.btn-link {
  background: none;
  border: none;
  font-size: 12px;
  cursor: pointer;
  color: #2563eb;
  padding: 0;
}
.reply-notice {
  font-size: 13px;
  color: #666;
  margin-bottom: 4px;
}
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-top: 16px;
}
.page-info {
  font-size: 14px;
  color: #666;
}
</style>
