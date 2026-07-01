<script setup lang="ts">
import { RouterView } from 'vue-router'
import AppNavbar from '@/components/AppNavbar.vue'
</script>

<template>
  <div class="app">
    <AppNavbar />
    <main class="main">
      <RouterView />
    </main>
    <footer class="footer">
      <p>&copy; {{ new Date().getFullYear() }} BlogX. All rights reserved.</p>
    </footer>
  </div>
</template>

<style>
*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #f5f5f5;
  color: #333;
  line-height: 1.6;
}

a {
  color: #2563eb;
  text-decoration: none;
}
a:hover {
  text-decoration: underline;
}

.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.main {
  flex: 1;
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px 16px;
}

.footer {
  text-align: center;
  padding: 24px;
  color: #999;
  font-size: 14px;
  border-top: 1px solid #eee;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 8px 20px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition:
    background 0.2s,
    opacity 0.2s;
}
.btn:hover {
  opacity: 0.9;
}
.btn-primary {
  background: #2563eb;
  color: #fff;
}
.btn-danger {
  background: #dc2626;
  color: #fff;
}
.btn-secondary {
  background: #e5e7eb;
  color: #333;
}
.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.form-group {
  margin-bottom: 16px;
}
.form-label {
  display: block;
  margin-bottom: 4px;
  font-weight: 500;
  font-size: 14px;
}
.form-input,
.form-textarea,
.form-select {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
}
.form-input:focus,
.form-textarea:focus,
.form-select:focus {
  border-color: #2563eb;
}
.form-textarea {
  min-height: 120px;
  resize: vertical;
}

.card {
  background: #fff;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  margin-bottom: 16px;
}

.tag {
  display: inline-block;
  padding: 2px 10px;
  background: #e0e7ff;
  color: #3730a3;
  border-radius: 12px;
  font-size: 12px;
  margin-right: 4px;
  margin-bottom: 4px;
}

.page-title {
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 20px;
}

.alert {
  padding: 12px 16px;
  border-radius: 6px;
  margin-bottom: 16px;
  font-size: 14px;
}
.alert-error {
  background: #fef2f2;
  color: #dc2626;
  border: 1px solid #fecaca;
}
.alert-success {
  background: #f0fdf4;
  color: #16a34a;
  border: 1px solid #bbf7d0;
}

.empty {
  text-align: center;
  padding: 48px;
  color: #999;
}
</style>
