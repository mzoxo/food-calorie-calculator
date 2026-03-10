<template>
  <header class="header">
    <button v-if="back" class="icon-btn" @click="router.back()">
      <ChevronLeft :size="16" :stroke-width="1.5" />
    </button>
    <h1 class="header-title" :style="back ? 'position:absolute;left:50%;transform:translateX(-50%);pointer-events:none' : ''">
      卡路里計算器
    </h1>
    <div class="header-actions">
      <button ref="menuBtn" class="icon-btn" title="選單" @click="onMenu">
        <Menu :size="16" :stroke-width="1.5" />
      </button>
    </div>
  </header>
</template>

<script setup>
import { ref } from 'vue'
import { Menu, ChevronLeft } from 'lucide-vue-next'
import { useRouter } from 'vue-router'

defineProps({ back: { type: Boolean, default: false } })
const emit    = defineEmits(['menu'])
const menuBtn = ref(null)
const router  = useRouter()

function onMenu() {
  const rect = menuBtn.value?.getBoundingClientRect()
  emit('menu', rect)
}
</script>
