import { reactive } from 'vue'

// ── 常數 ──────────────────────────────────────────────
export const DEFAULT_GROUPS = ['早餐', '午餐', '晚餐', '點心', '水果', '飲料']

const KEYS = {
  API:     'fc_api_url',
  TOKEN:   'fc_token',
  STATE:   'fc_state',
  RECENT:  'fc_recent',
  PRESETS: 'fc_presets',
  CACHE:   'fc_food_cache',
  PROFILE: 'fc_user_profile',
}

// ── Store ──────────────────────────────────────────────
export const store = reactive({
  // 食材資料庫
  foods: [],

  // 群組：{ groupName: [{ food, quantity, mode, note, presetName, presetId }] }
  groups: {},
  groupOrder: [],
  activeGroup: '',

  // 常用組合：[{ name, divider, items }]
  presets: [],

  // 最近使用（max 10）
  recent: [],

  // 個人資料（BMR/TDEE 計算用）
  userProfile: null,

  // Modal 開關狀態
  modal: {
    addFood:    { visible: false, food: null, editMode: false, groupName: '', index: -1, note: '' },
    presets:    { visible: false },
    presetSave: { visible: false },
    presetUse:  { visible: false, preset: null, qty: 1 },
    import:     { visible: false },
    export:     { visible: false },
    profile:    { visible: false },
    confirm:    { visible: false, message: '', resolve: null },
    input:      { visible: false, title: '', defaultValue: '', resolve: null },
  },

  // Toast
  toast: { message: '', visible: false },

  // 全域載入中
  loading: false,
})

// ── LocalStorage 存取 ─────────────────────────────────

export function getApiUrl()  { return localStorage.getItem(KEYS.API)   || '' }
export function getToken()   { return (localStorage.getItem(KEYS.TOKEN) || '').toLowerCase() }
export function setApiUrl(v) { localStorage.setItem(KEYS.API,   v) }
export function setToken(v)  { localStorage.setItem(KEYS.TOKEN, v) }
export function isConfigured() { return !!(getApiUrl() && getToken()) }

export function saveState() {
  localStorage.setItem(KEYS.STATE, JSON.stringify({
    groups:      store.groups,
    groupOrder:  store.groupOrder,
    activeGroup: store.activeGroup,
  }))
}

export function loadState() {
  try {
    const s = JSON.parse(localStorage.getItem(KEYS.STATE))
    if (s?.groups) {
      store.groups      = s.groups
      store.groupOrder  = s.groupOrder  || [...DEFAULT_GROUPS]
      store.activeGroup = s.activeGroup || store.groupOrder[0]
      return
    }
  } catch {}
  initDefaultGroups()
}

export function saveRecent() {
  localStorage.setItem(KEYS.RECENT, JSON.stringify(store.recent.slice(0, 10)))
}

export function loadRecent() {
  try {
    store.recent = JSON.parse(localStorage.getItem(KEYS.RECENT)) || []
  } catch {
    store.recent = []
  }
}

export function savePresets() {
  localStorage.setItem(KEYS.PRESETS, JSON.stringify(store.presets))
}

export function loadPresets() {
  try {
    store.presets = JSON.parse(localStorage.getItem(KEYS.PRESETS)) || []
  } catch {
    store.presets = []
  }
}

export function saveCache(foods) {
  localStorage.setItem(KEYS.CACHE, JSON.stringify({ ts: Date.now(), data: foods }))
}

export function loadCache(maxAgeMs = 24 * 60 * 60 * 1000) {
  try {
    const c = JSON.parse(localStorage.getItem(KEYS.CACHE))
    if (c?.data && Date.now() - c.ts < maxAgeMs) return c.data
  } catch {}
  return null
}

export function saveUserProfile() {
  localStorage.setItem(KEYS.PROFILE, JSON.stringify(store.userProfile))
}

export function loadUserProfile() {
  try {
    store.userProfile = JSON.parse(localStorage.getItem(KEYS.PROFILE)) || null
  } catch {
    store.userProfile = null
  }
}

export function clearAll() {
  Object.values(KEYS).forEach(k => localStorage.removeItem(k))
  store.foods       = []
  store.presets     = []
  store.recent      = []
  store.userProfile = null
  initDefaultGroups()
}

// ── 群組操作 ──────────────────────────────────────────

export function initDefaultGroups() {
  store.groupOrder  = [...DEFAULT_GROUPS]
  store.activeGroup = DEFAULT_GROUPS[0]
  store.groups      = Object.fromEntries(DEFAULT_GROUPS.map(g => [g, []]))
}

export function ensureGroup(name) {
  if (!store.groups[name]) store.groups[name] = []
}

// ── 食材操作 ──────────────────────────────────────────

export function addFoodToGroup(food, quantity, mode, groupName, { note = '', presetName = null, presetId = null } = {}) {
  const target = groupName || store.activeGroup
  ensureGroup(target)
  store.groups[target].push({ food, quantity, mode, note, presetName, presetId })
  saveState()
}

export function removeFoodFromGroup(groupName, index) {
  store.groups[groupName].splice(index, 1)
  saveState()
}

// ── 最近使用 ─────────────────────────────────────────

export function addToRecent(food) {
  store.recent = [food, ...store.recent.filter(f => f['名稱'] !== food['名稱'])].slice(0, 10)
  saveRecent()
}

export function removeFromRecent(index) {
  store.recent.splice(index, 1)
  saveRecent()
}

// ── Toast ─────────────────────────────────────────────

let _toastTimer = null
export function showToast(message) {
  store.toast.message = message
  store.toast.visible = true
  clearTimeout(_toastTimer)
  _toastTimer = setTimeout(() => { store.toast.visible = false }, 2000)
}

// ── Modal 工具（Promise 型）────────────────────────────

export function showConfirm(message) {
  return new Promise(resolve => {
    store.modal.confirm = { visible: true, message, resolve }
  })
}

export function showPrompt(title, defaultValue = '') {
  return new Promise(resolve => {
    store.modal.input = { visible: true, title, defaultValue, resolve }
  })
}
