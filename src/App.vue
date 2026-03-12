<template>
  <RouterView />
  <ConfirmModal />
  <InputModal />
  <Toast />
</template>

<script setup>
import { onMounted } from 'vue'
import ConfirmModal from './components/modals/ConfirmModal.vue'
import InputModal   from './components/modals/InputModal.vue'
import Toast        from './components/modals/Toast.vue'
import { loadState, loadRecent, loadUserProfile, loadPresets } from './store/index.js'

onMounted(() => {
  loadState()
  loadRecent()
  loadUserProfile()
  loadPresets()   // async，fire-and-forget（localStorage 同步，API 非同步）
})
</script>
