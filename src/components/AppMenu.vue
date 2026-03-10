<template>
  <Teleport to="body">
    <div v-if="visible" class="menu-backdrop" @click="$emit('close')" />
    <transition name="menu">
      <div v-if="visible" class="app-menu" :style="menuStyle">
        <button class="menu-item" @click="emit('open-profile')">
          <User :size="15" :stroke-width="1.5" />
          個人資料
        </button>
        <button class="menu-item" @click="onAddGroup">
          <Plus :size="15" :stroke-width="1.5" />
          新增群組
        </button>
        <button class="menu-item" @click="goToFoods">
          <Database :size="15" :stroke-width="1.5" />
          食材資料庫
        </button>
        <button class="menu-item" @click="goToDiet">
          <ClipboardList :size="15" :stroke-width="1.5" />
          飲食記錄
        </button>
        <div class="menu-divider" />
        <button class="menu-item" @click="emit('refresh')">
          <RefreshCw :size="15" :stroke-width="1.5" />
          重新抓取食材
        </button>
        <div class="menu-divider" />
        <button class="menu-item danger" @click="emit('clear-all')">
          <Trash2 :size="15" :stroke-width="1.5" />
          重設
        </button>
      </div>
    </transition>
  </Teleport>
</template>

<script setup>
import { computed } from 'vue'
import { Plus, User, RefreshCw, Eraser, Trash2, Database, ClipboardList } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import { store, showPrompt, showToast, saveState, initDefaultGroups } from '../store/index.js'

const props = defineProps({ visible: Boolean, anchor: Object })
const router = useRouter()

const menuStyle = computed(() => {
  if (!props.anchor) return {}
  return {
    top:   `${props.anchor.bottom + 6}px`,
    right: `${window.innerWidth - props.anchor.right}px`,
  }
})
const emit  = defineEmits(['close', 'open-profile', 'refresh', 'clear-all'])

function goToFoods() {
  emit('close')
  router.push('/foods')
}

function goToDiet() {
  emit('close')
  router.push('/diet')
}

async function onAddGroup() {
  emit('close')
  const name = await showPrompt('新增群組', '')
  if (!name?.trim()) return
  const trimmed = name.trim()
  if (store.groupOrder.includes(trimmed)) {
    showToast('群組名稱已存在')
    return
  }
  store.groups[trimmed]    = []
  store.groupOrder.push(trimmed)
  store.activeGroup = trimmed
  saveState()
}
</script>

<style scoped>
.menu-backdrop {
  position: fixed;
  inset: 0;
  z-index: 50;
}

.app-menu {
  position: fixed;
  top: 50px;
  right: 16px;
  background: var(--c-bg);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  z-index: 51;
  min-width: 160px;
  padding: 4px;
  display: flex;
  flex-direction: column;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: var(--gap-sm);
  padding: 8px var(--gap-md);
  border: none;
  background: none;
  cursor: pointer;
  font-size: 0.82rem;
  font-family: var(--font);
  color: var(--c-text);
  border-radius: var(--radius);
  text-align: left;
  transition: background var(--duration) var(--ease);
}

.menu-item:hover {
  background: var(--c-surface-hover);
}

.menu-item.danger {
  color: var(--c-danger);
}

.menu-divider {
  height: 1px;
  background: var(--c-border-light);
  margin: 4px 0;
}

/* 動畫 */
.menu-enter-active,
.menu-leave-active {
  transition: opacity 0.15s var(--ease), transform 0.15s var(--ease);
}
.menu-enter-from,
.menu-leave-to {
  opacity: 0;
  transform: translateY(-4px) scale(0.97);
}
</style>
