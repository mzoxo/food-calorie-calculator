<template>
  <header class="header">
    <h1 class="header-title">卡路里計算器</h1>
    <div class="header-actions">
      <button class="icon-btn" title="重新整理食材資料" @click="$emit('refresh')">
        <RefreshCw :size="16" :stroke-width="1.5" />
      </button>
      <button ref="menuBtn" class="icon-btn" title="選單" @click="onMenu">
        <Menu :size="16" :stroke-width="1.5" />
      </button>
    </div>
  </header>
</template>

<script setup>
import { ref } from 'vue'
import { RefreshCw, Menu } from 'lucide-vue-next'

const emit   = defineEmits(['refresh', 'menu'])
const menuBtn = ref(null)

function onMenu() {
  const rect = menuBtn.value?.getBoundingClientRect()
  emit('menu', rect)
}
</script>
