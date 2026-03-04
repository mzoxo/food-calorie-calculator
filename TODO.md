# 食材卡路里計算器 — 重構 Todo List

> 分支：`feature/vue-refactor`
> 目標：從純 HTML/JS 遷移至 Vite + Vue 3，並新增以下功能

---

## Phase 1 — 專案架構建立

- [x] 初始化 Vite + Vue 3 專案（`package.json`、`vite.config.js`）
- [x] 設定 Vue Router（hash mode，`/` 和 `/login`）
- [x] 建立 `src/` 目錄結構（views、components、store、utils）
- [x] 把舊檔案（`index.html`、`app.js`、`style.css`）移到 `_old/` 備用
- [x] 把 `foods.json` 移至 `public/`
- [x] 建立 `src/style.css`（沿用舊 CSS，補新樣式）
- [x] 安裝 `lucide-vue-next`（取代 CDN）

---

## Phase 2 — 核心 Store & 工具函式

- [x] `src/store/index.js` — 全域 reactive state（foods、groups、groupOrder、activeGroup、presets、recent、userProfile、modal 狀態）
- [x] `src/utils/calc.js` — 營養計算（compute、subtotal、total、BMR、TDEE、減脂目標）
- [x] `src/utils/api.js` — API 呼叫（fetchFoods、fetchDefaultFoods、fetchDiet）
- [x] `src/utils/export.js` — 匯出文字產生

---

## Phase 3 — 主計算頁（CalcView）

- [x] `AppHeader.vue` — 標題 + 右上角選單按鈕
- [x] `AppMenu.vue` — 右上角下拉選單（新增群組、個人資料、重新整理、清除資料）
- [x] `SearchBox.vue` — 搜尋框 + 清除按鈕
- [x] `RecentFoods.vue` — 最近使用（chip 列表 + 編輯/刪除模式）
- [x] `GroupTabs.vue` — 餐次 Tab（支援右鍵/長按更名、刪除）
- [x] `GroupItems.vue` — 群組食材列表（含組合階層邏輯）
- [x] `FoodItem.vue` — 單筆食材（名稱、detail、熱量、刪除、備註折疊顯示/編輯）
- [x] `NutritionTotal.vue` — 總計區塊（BMR/TDEE 進度條 + 兩個圓餅圖）
- [ ] `CalcView.vue` — 組合以上元件 + Footer 按鈕列

---

## Phase 4 — 彈窗元件

- [ ] `AddFoodModal.vue` — 加入食材（克數/份數切換、+/−、即時預覽、選群組）
- [ ] `PresetsModal.vue` — 常用組合列表（使用、刪除）
- [ ] `PresetSaveModal.vue` — 儲存組合（名稱、份數分割、預覽）
- [ ] `PresetUseModal.vue` — 使用組合預覽（含階層加入）
- [ ] `ImportModal.vue` — 匯入飲食記錄（日期查詢 + 確認匯入）
- [ ] `ExportModal.vue` — 匯出文字 + 複製
- [ ] `ProfileModal.vue` — 個人資料（年齡、身高、體重、運動習慣五級、減脂目標）
- [ ] `ConfirmModal.vue` — 通用確認對話框
- [ ] `InputModal.vue` — 通用輸入對話框
- [ ] `Toast.vue` — 底部提示訊息

---

## Phase 5 — 設定頁（LoginView）

- [ ] `LoginView.vue` — API URL + Token 輸入、儲存、返回首頁
  - 路由 `/login`，不從任何 UI 連結，只有知道網址的人能進入

---

## Phase 6 — 新功能實作

- [ ] **BMR/TDEE 進度條**
  - Mifflin-St Jeor 公式計算 BMR
  - 五級活動係數（久坐 1.2 / 輕度 1.375 / 中度 1.55 / 高度 1.725 / 極高 1.9）
  - 減脂目標 = TDEE × 0.9（略低於 TDEE）
  - 顯示於總計區塊：今日攝取 vs BMR vs TDEE 進度條
- [ ] **食材備註**
  - 群組 items 資料結構加 `note` 欄位
  - FoodItem 預設折疊，點擊展開顯示備註
  - 點擊備註可編輯（inline 或 modal）
- [ ] **組合階層顯示**
  - items 加 `presetName` + `presetId` tag
  - GroupItems 依 presetId 聚合，組合名稱縮排顯示為標題列
  - 支援折疊/展開組合內食材
  - 可個別刪除組合內食材，或整組刪除
- [ ] **新增群組移到右上角選單**
- [ ] **群組 Tab 更名/刪除**：保留右鍵或長按 context menu

---

## Phase 7 — 收尾

- [ ] GitHub Pages 部署設定（`vite.config.js` base path）
- [ ] 全功能測試（搜尋、計算、localStorage、API 呼叫、匯入匯出）
- [ ] 更新 `Requirements.md`

---

## 資料結構變更紀錄

### 群組 items（新增 note、presetName、presetId）
```js
// 舊
{ food, quantity, mode }

// 新
{
  food,
  quantity,
  mode,
  note: '',           // 備註，預設空字串
  presetName: null,   // 來自哪個常用組合（null = 獨立食材）
  presetId: null,     // 同一次加入的 preset 共用相同 id（用 Date.now() 或 uuid）
}
```

### userProfile（新增）
```js
{
  age: null,
  height: null,
  weight: null,
  activityLevel: 1.375,  // 預設輕度
  goal: 'cut',           // 'cut' = 減脂（TDEE × 0.9）
}
```

---

## 目錄結構預覽

```
src/
├── main.js
├── App.vue
├── router.js
├── style.css
├── store/
│   └── index.js
├── utils/
│   ├── calc.js
│   ├── api.js
│   └── export.js
├── views/
│   ├── CalcView.vue
│   └── LoginView.vue
└── components/
    ├── AppHeader.vue
    ├── AppMenu.vue
    ├── SearchBox.vue
    ├── RecentFoods.vue
    ├── GroupTabs.vue
    ├── GroupItems.vue
    ├── FoodItem.vue
    ├── NutritionTotal.vue
    └── modals/
        ├── AddFoodModal.vue
        ├── PresetsModal.vue
        ├── PresetSaveModal.vue
        ├── PresetUseModal.vue
        ├── ImportModal.vue
        ├── ExportModal.vue
        ├── ProfileModal.vue
        ├── ConfirmModal.vue
        ├── InputModal.vue
        └── Toast.vue
```
