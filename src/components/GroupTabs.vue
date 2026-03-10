<template>
  <div class="tabs-bar">
    <div class="tabs">
      <button
        v-for="name in store.groupOrder"
        :key="name"
        class="tab"
        :class="{ active: activeGroupValue === name }"
        @click="onTabClick(name)"
        @contextmenu.prevent="!readonly && openMenu(name, $event)"
        @touchstart="!readonly && onTouchStart(name)"
        @touchend="onTouchEnd"
        @touchmove="onTouchEnd"
      >
        {{ name }}<span v-if="tabCount(name)" class="tab-count">({{ tabCount(name) }})</span>
        <span
          v-if="!readonly && !DEFAULT_GROUPS.includes(name)"
          class="tab-remove"
          @click.stop="quickDelete(name)"
        >×</span>
      </button>
    </div>
  </div>

  <!-- Context menu -->
  <Teleport to="body">
    <div v-if="menu.visible" class="menu-backdrop" @click="closeMenu" />
    <transition name="menu">
      <div v-if="menu.visible" class="tab-context-menu" :style="menuStyle">
        <button class="menu-item" @click="rename">
          <Pencil :size="14" :stroke-width="1.5" />
          更名
        </button>
        <button class="menu-item danger" @click="deleteGroup">
          <Trash2 :size="14" :stroke-width="1.5" />
          刪除群組
        </button>
      </div>
    </transition>
  </Teleport>
</template>

<script setup>
import { reactive, computed } from 'vue'
import { Pencil, Trash2 } from 'lucide-vue-next'
import { store, saveState, showPrompt, showConfirm, showToast, DEFAULT_GROUPS } from '../store/index.js'

const props = defineProps({
  // 傳入時由父元件控制 activeGroup（DietView），不傳時讀寫 store.activeGroup（CalcView）
  modelValue: { type: String, default: null },
  // 各餐項目數 map，不傳時讀 store.groups[name].length
  counts: { type: Object, default: null },
  // 唯讀模式：隱藏右鍵選單、更名、刪除
  readonly: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue'])

const activeGroupValue = computed(() =>
  props.modelValue !== null ? props.modelValue : store.activeGroup
)

function onTabClick(name) {
  if (props.modelValue !== null) emit('update:modelValue', name)
  else store.activeGroup = name
}

function tabCount(name) {
  if (props.counts) return props.counts[name] || 0
  return store.groups[name]?.length || 0
}

// ── Context menu ──────────────────────────────────────
const menu = reactive({ visible: false, group: '', x: 0, y: 0 })

const menuStyle = computed(() => ({
  position: 'fixed',
  top:  `${menu.y}px`,
  left: `${menu.x}px`,
}))

function openMenu(name, e) {
  if (DEFAULT_GROUPS.includes(name)) return
  menu.group   = name
  menu.x       = Math.min(e.clientX, window.innerWidth  - 170)
  menu.y       = Math.min(e.clientY, window.innerHeight - 100)
  menu.visible = true
}

function closeMenu() { menu.visible = false }

// ── 長按（touch）────────────────────────────────────
let longPressTimer = null

function onTouchStart(name) {
  if (DEFAULT_GROUPS.includes(name)) return
  longPressTimer = setTimeout(() => {
    menu.group   = name
    menu.x       = window.innerWidth  / 2 - 80
    menu.y       = window.innerHeight / 2 - 50
    menu.visible = true
  }, 600)
}

function onTouchEnd() {
  clearTimeout(longPressTimer)
}

// ── 操作 ─────────────────────────────────────────────
async function rename() {
  closeMenu()
  const oldName = menu.group
  const newName = await showPrompt('更名群組', oldName)
  if (!newName?.trim() || newName.trim() === oldName) return
  const trimmed = newName.trim()
  if (store.groupOrder.includes(trimmed)) {
    showToast('群組名稱已存在')
    return
  }
  // 更新 groupOrder
  const idx = store.groupOrder.indexOf(oldName)
  store.groupOrder.splice(idx, 1, trimmed)
  // 移轉 items
  store.groups[trimmed] = store.groups[oldName] || []
  delete store.groups[oldName]
  if (store.activeGroup === oldName) store.activeGroup = trimmed
  saveState()
}

async function quickDelete(name) {
  const ok = await showConfirm(`確定刪除「${name}」群組及其所有食材？`)
  if (!ok) return
  const idx = store.groupOrder.indexOf(name)
  store.groupOrder.splice(idx, 1)
  delete store.groups[name]
  if (store.activeGroup === name) {
    store.activeGroup = store.groupOrder[Math.max(0, idx - 1)]
  }
  saveState()
}

async function deleteGroup() {
  closeMenu()
  if (store.groupOrder.length <= 1) {
    showToast('至少保留一個群組')
    return
  }
  const ok = await showConfirm(`確定刪除「${menu.group}」群組及其所有食材？`)
  if (!ok) return
  const idx = store.groupOrder.indexOf(menu.group)
  store.groupOrder.splice(idx, 1)
  delete store.groups[menu.group]
  if (store.activeGroup === menu.group) {
    store.activeGroup = store.groupOrder[Math.max(0, idx - 1)]
  }
  saveState()
}
</script>

<style scoped>
.tab-remove {
  margin-left: 3px;
  font-size: 0.75rem;
  line-height: 1;
  color: var(--c-text-muted);
  opacity: 0.5;
  transition: opacity var(--duration) var(--ease);
}

.tab:hover .tab-remove,
.tab.active .tab-remove {
  opacity: 1;
}

.menu-backdrop {
  position: fixed;
  inset: 0;
  z-index: 50;
}

.tab-context-menu {
  background: var(--c-bg);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  z-index: 51;
  min-width: 140px;
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
  transition: background var(--duration) var(--ease);
}

.menu-item:hover { background: var(--c-surface-hover); }
.menu-item.danger { color: var(--c-danger); }

.menu-enter-active,
.menu-leave-active {
  transition: opacity 0.15s var(--ease), transform 0.15s var(--ease);
}
.menu-enter-from,
.menu-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
</style>
