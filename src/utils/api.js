import { store, getApiUrl, getToken, saveCache, loadCache, showToast } from '../store/index.js'

/**
 * 從 App Script API 拉取食材資料
 */
async function fetchFromApi() {
  const url = `${getApiUrl()}?token=${getToken()}&action=getAllFoods`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  const json = await res.json()
  if (json.error) throw new Error(json.error)
  return json
}

/**
 * 從本地 foods.json 拉取食材資料
 */
async function fetchFromLocal() {
  const res = await fetch('./foods.json')
  if (!res.ok) throw new Error('無法載入本地食材資料')
  return res.json()
}

/**
 * 載入食材資料：API → cache → foods.json
 * @param {boolean} forceRefresh - 強制重新從 API 拉取
 */
export async function loadFoods(forceRefresh = false) {
  // 不強制更新時，先試 cache
  if (!forceRefresh) {
    const cached = loadCache()
    if (cached) {
      store.foods = cached
      return
    }
  }

  // 有設定 API 才嘗試呼叫
  if (getApiUrl() && getToken()) {
    try {
      const foods = await fetchFromApi()
      store.foods = foods
      saveCache(foods)
      showToast(`已載入 ${foods.length} 筆食材`)
      return
    } catch (e) {
      console.warn('API 載入失敗，改用備用資料', e)
      // API 失敗時嘗試 cache
      const cached = loadCache(Infinity)
      if (cached) {
        store.foods = cached
        showToast('API 連線失敗，使用快取資料')
        return
      }
    }
  }

  // 最後 fallback：本地 foods.json
  try {
    const foods = await fetchFromLocal()
    store.foods = foods
    showToast(`已載入 ${foods.length} 筆食材（本地資料）`)
  } catch (e) {
    store.foods = []
    showToast('無法載入食材資料')
    console.error(e)
  }
}

/**
 * 查詢某日的飲食記錄
 * @param {string} date - 格式 yyyy/MM/dd
 * @returns {Array} 飲食記錄
 */
export async function fetchDiet(date) {
  const url = `${getApiUrl()}?token=${getToken()}&action=getDiet&date=${date}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  const json = await res.json()
  if (json.error) throw new Error(json.error)
  return json.records || []
}
