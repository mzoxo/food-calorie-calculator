<template>
  <main class="login-page">
    <div class="login-card">
      <h1 class="login-title">設定</h1>

      <div class="field">
        <span class="field-label">API URL</span>
        <input
          v-model="apiUrl"
          type="url"
          class="input"
          placeholder="https://script.google.com/macros/s/…/exec"
        />
      </div>

      <div class="field">
        <span class="field-label">TOKEN</span>
        <input
          v-model="token"
          type="password"
          class="input"
          placeholder="輸入你的 Token"
        />
      </div>

      <button class="btn btn-primary btn-block" @click="save">儲存設定</button>

      <hr style="border:0;border-top:1px solid var(--c-border-light)" />

      <button class="btn btn-outline btn-block" @click="$router.push('/')">← 返回</button>

      <button class="btn btn-danger-outline btn-block" @click="onClearAll">清除所有資料</button>
    </div>
  </main>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getApiUrl, getToken, setApiUrl, setToken, clearAll, showToast } from '../store/index.js'

const router = useRouter()
const apiUrl = ref('')
const token  = ref('')

onMounted(() => {
  apiUrl.value = getApiUrl()
  token.value  = getToken()
})

function save() {
  setApiUrl(apiUrl.value.trim())
  setToken(token.value.trim())
  showToast('設定已儲存')
}

function onClearAll() {
  clearAll()
  showToast('已清除所有資料')
}
</script>

<style scoped>
.login-page {
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--gap-lg);
  background: var(--c-bg);
}

.login-card {
  width: 100%;
  max-width: 400px;
  display: flex;
  flex-direction: column;
  gap: var(--gap-md);
}

.login-title {
  font-size: 1.1rem;
  font-weight: 600;
  letter-spacing: -0.02em;
  margin-bottom: var(--gap-xs);
}
</style>
