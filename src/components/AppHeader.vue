<template>
  <header class="header">
    <button v-if="back" class="icon-btn" @click="router.back()">
      <ChevronLeft :size="16" :stroke-width="1.5" />
    </button>
    <h1 class="header-title" :style="back ? 'position:absolute;left:50%;transform:translateX(-50%);pointer-events:none' : ''">
      {{ title }}
    </h1>
    <div v-if="!back" class="header-actions">
      <button ref="menuBtn" class="icon-btn" title="選單" @click="onMenu">
        <Menu :size="16" :stroke-width="1.5" />
      </button>
    </div>
    <div v-else style="width:32px" />
  </header>
</template>

<script setup>
import { ref } from 'vue'
import { Menu, ChevronLeft } from 'lucide-vue-next'
import { useRouter } from 'vue-router'

defineProps({
  back:  { type: Boolean, default: false },
  title: { type: String, default: '卡路里計算器' },
})
const emit    = defineEmits(['menu'])
const menuBtn = ref(null)
const router  = useRouter()

function onMenu() {
  const rect = menuBtn.value?.getBoundingClientRect()
  emit('menu', rect)
}
</script>
