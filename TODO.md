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
- [x] `CalcView.vue` — 組合以上元件 + Footer 按鈕列

---

## Phase 4 — 彈窗元件

- [x] `AddFoodModal.vue` — 加入食材（克數/份數切換、+/−、即時預覽、選群組）
- [x] `PresetsModal.vue` — 常用組合列表（使用、刪除）
- [x] `PresetSaveModal.vue` — 儲存組合（名稱、份數分割、預覽）
- [x] `PresetUseModal.vue` — 使用組合預覽（含階層加入）
- [x] `ImportModal.vue` — 匯入飲食記錄（日期查詢 + 確認匯入）
- [x] `ExportModal.vue` — 匯出文字 + 複製
- [x] `ProfileModal.vue` — 個人資料（年齡、身高、體重、運動習慣五級、減脂目標）
- [x] `ConfirmModal.vue` — 通用確認對話框
- [x] `InputModal.vue` — 通用輸入對話框
- [x] `Toast.vue` — 底部提示訊息

---

## Phase 5 — 設定頁（LoginView）

- [x] `LoginView.vue` — API URL + Token 輸入、儲存、返回首頁
  - 路由 `/login`，不從任何 UI 連結，只有知道網址的人能進入

---

## Phase 6 — 新功能實作

- [x] **BMR/TDEE 進度條**
  - Mifflin-St Jeor 公式計算 BMR
  - 五級活動係數（久坐 1.2 / 輕度 1.375 / 中度 1.55 / 高度 1.725 / 極高 1.9）
  - 減脂目標 = TDEE × 0.9（略低於 TDEE）
  - 顯示於總計區塊：今日攝取 vs BMR vs TDEE 進度條
- [x] **食材備註**
  - 群組 items 資料結構加 `note` 欄位
  - FoodItem 顯示備註（有才顯示），鉛筆按鈕開啟 AddFoodModal 編輯模式
  - AddFoodModal editMode：預填克數/份數/備註，儲存更改
- [x] **組合階層顯示**
  - items 加 `presetName` + `presetId` tag
  - GroupItems 依 presetId 聚合，組合名稱縮排顯示為標題列
  - 支援折疊/展開組合內食材
  - 可個別刪除組合內食材，或整組刪除
- [x] **新增群組移到右上角選單**
- [x] **群組 Tab 更名/刪除**：右鍵或長按 context menu

---

## Phase 7 — 收尾

- [x] GitHub Pages 部署設定（GitHub Actions workflow，`vite.config.js` base `'./'`）
- [x] 全功能測試（搜尋、計算、localStorage、API 呼叫、匯入匯出）
- [x] 更新 `Requirements.md`

---

## Phase 8 — 技術債 / 重構

- [x] **`#app` flex 結構修正** — body 已是 flex column，但 `#app` 未繼承，導致子元件無法用 `flex: 1` 撐滿畫面，目前用 `height: calc` workaround（影響：foods-table-scroll 高度不準、foods-status-notice 無法撐滿）
- [x] **基準計算邏輯抽 composable** — `calcGrams`、`BASIS_KEY_MAP` 分散在 `FoodTable`、`FoodCompareModal`、`FoodsView`，應抽成 `useBasis()` composable 共用
- [x] **Modal 狀態統一管理** — `store.modal.*` 越來越多，考慮更系統化的管理方式

---

## Phase 9 — 飲食日記頁（DietView 重做）

### 9-1 路由 & 導航
- [x] `router.js` — 新增 `/diet` 路由
- [x] `AppMenu.vue` — 新增「飲食記錄」選項（`isConfigured()` 才顯示）

### 9-2 元件改造
- [x] `NutritionTotal.vue` — 新增 optional prop `records`，有傳時改用 records 計算，無傳維持讀 `store.groups`（CalcView 不受影響）
- [x] `GroupTabs.vue` — 新增 props：`modelValue`（activeGroup）、`counts`（各餐項目數 map）、`readonly`（隱藏右鍵選單/更名/刪除），DietView 傳 props，CalcView 不傳維持現有行為

### 9-3 新 DietView 主體
- [x] `DietView.vue` — 完整重寫，結構如下：
  - AppHeader + AppMenu（同 CalcView）
  - 日期導覽列（← 日期 →）
  - BMR/TDEE 進度條（複用 NutritionTotal 上半段邏輯）
  - GroupTabs（readonly 模式，顯示各餐項目數）
  - 當前餐別小計 header（餐名 · kcal · 碳Xg · 蛋Xg · 脂Xg）
  - 記錄列表（格式同 FoodItem：名稱 / 份量·碳·蛋·脂 / kcal / 刪除）
  - NutritionTotal 圓圈（傳 records prop）
  - 浮動 + 按鈕

### 9-4 工具函式
- [x] `utils/export.js` — 新增 `generatePresetNote(preset, servings)` 產生備註字串
- [x] `utils/export.js` — 新增 `presetToRows(preset, servings, group, date)` 回傳 API rows（整組模式 1 筆，個別模式多筆）

### 9-5 AddDietFoodModal（全新）
- [x] `modals/AddDietFoodModal.vue` — 兩個 Tab：
  - **搜尋食物**：搜尋食材 → 填份量 → 選餐別（預設當前 tab）→ 確認 → `logDietRow()`
  - **常用組合**：
    - 列出 `store.presets`
    - 每個組合：整組 checkbox + 份數 input + 展開按鈕
    - 整組打勾時個別項目 disabled，寫入 1 筆（食品名稱 = 組合名稱，備註 = 所有食材名稱+份量）
    - 展開後個別打勾（整組未勾），每項各寫 1 筆
    - 頂部餐別 select（預設當前 tab，可覆蓋）

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
