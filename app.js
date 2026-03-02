// =====================================================
// 食材卡路里計算器 - app.js
// =====================================================

(function () {
  'use strict';

  // ── 預設群組 ──────────────────────────────────
  const DEFAULT_GROUPS = ['早餐', '午餐', '晚餐', '點心', '水果'];

  // ── State ─────────────────────────────────────────
  const state = {
    foods: [],          // 所有食材資料
    groups: {},         // { groupName: [{ food, quantity, mode }] }
    groupOrder: [],     // 群組順序
    activeGroup: '',    // 當前選中的群組
    presets: [],        // 常用組合
    recent: [],         // 最近使用的食材
    useMock: false,     // 是否使用 mock 資料
  };

  // ── Config（localStorage 管理）────────────────────
  const Config = {
    KEY_API: 'fc_api_url',
    KEY_TOKEN: 'fc_token',
    KEY_STATE: 'fc_state',
    KEY_RECENT: 'fc_recent',
    KEY_PRESETS: 'fc_presets',
    KEY_CACHE: 'fc_food_cache',

    get apiUrl() { return localStorage.getItem(this.KEY_API) || ''; },
    set apiUrl(v) { localStorage.setItem(this.KEY_API, v); },
    get token() { return (localStorage.getItem(this.KEY_TOKEN) || '').toLowerCase(); },
    set token(v) { localStorage.setItem(this.KEY_TOKEN, v); },

    get isConfigured() { return !!(this.apiUrl && this.token); },

    saveState() {
      localStorage.setItem(this.KEY_STATE, JSON.stringify({
        groups: state.groups,
        groupOrder: state.groupOrder,
        activeGroup: state.activeGroup,
      }));
    },

    loadState() {
      try {
        const s = JSON.parse(localStorage.getItem(this.KEY_STATE));
        if (s && s.groups) {
          state.groups = s.groups;
          state.groupOrder = s.groupOrder || DEFAULT_GROUPS;
          state.activeGroup = s.activeGroup || state.groupOrder[0];
        }
      } catch (e) { /* ignore */ }
    },

    saveRecent() {
      localStorage.setItem(this.KEY_RECENT, JSON.stringify(state.recent.slice(0, 10)));
    },

    loadRecent() {
      try {
        state.recent = JSON.parse(localStorage.getItem(this.KEY_RECENT)) || [];
      } catch (e) { state.recent = []; }
    },

    savePresets() {
      localStorage.setItem(this.KEY_PRESETS, JSON.stringify(state.presets));
    },

    loadPresets() {
      try {
        state.presets = JSON.parse(localStorage.getItem(this.KEY_PRESETS)) || [];
      } catch (e) { state.presets = []; }
    },

    saveCache(foods) {
      localStorage.setItem(this.KEY_CACHE, JSON.stringify({ ts: Date.now(), data: foods }));
    },

    loadCache() {
      try {
        const c = JSON.parse(localStorage.getItem(this.KEY_CACHE));
        if (c && c.data) return c.data;
      } catch (e) { /* ignore */ }
      return null;
    },

    clearAll() {
      [this.KEY_API, this.KEY_TOKEN, this.KEY_STATE, this.KEY_RECENT, this.KEY_PRESETS, this.KEY_CACHE]
        .forEach(k => localStorage.removeItem(k));
    },
  };

  // ── API ───────────────────────────────────────────
  const API = {
    async fetchFoods() {
      const url = `${Config.apiUrl}?token=${encodeURIComponent(Config.token)}&action=getAllFoods`;
      const res = await fetch(url, { redirect: 'follow' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      return Array.isArray(data) ? data : [];
    },

    async fetchDefaultFoods() {
      const res = await fetch('./foods.json');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },

    async fetchDiet(date) {
      const url = `${Config.apiUrl}?token=${encodeURIComponent(Config.token)}&action=getDiet&date=${encodeURIComponent(date)}`;
      const res = await fetch(url, { redirect: 'follow' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      return data;
    },
  };

  // ── Search ────────────────────────────────────────
  const Search = {
    query(term) {
      if (!term || term.length === 0) return [];
      const t = term.toLowerCase();
      return state.foods.filter(f => {
        const name = (f['名稱'] || '').toLowerCase();
        const alias = (f['別名'] || '').toLowerCase();
        const brand = (f['品牌'] || '').toLowerCase();
        const category = (f['分類'] || '').toLowerCase();
        return name.includes(t) || alias.includes(t) || brand.includes(t) || category.includes(t);
      }).slice(0, 15);
    },
  };

  // ── Calculator ────────────────────────────────────
  const Calc = {
    /** 計算營養素。mode: 'gram' | 'serving' */
    compute(food, quantity, mode) {
      if (mode === 'serving') {
        return {
          calories: round(num(food['每份熱量']) * quantity),
          carb: round(num(food['每份碳水']) * quantity),
          fat: round(num(food['每份脂肪']) * quantity),
          protein: round(num(food['每份蛋白質']) * quantity),
          fiber: round(num(food['每份膳食纖維']) * quantity),
          grams: round(num(food['每份量(g)']) * quantity),
        };
      }
      // gram mode
      const factor = quantity / 100;
      return {
        calories: round(num(food['每 100g 熱量']) * factor),
        carb: round(num(food['每 100g 碳水']) * factor),
        fat: round(num(food['每 100g 脂肪']) * factor),
        protein: round(num(food['每 100g 蛋白質']) * factor),
        fiber: round(num(food['每 100g 膳食纖維']) * factor),
        grams: quantity,
      };
    },

    /** 計算群組小計 */
    subtotal(items) {
      const r = { calories: 0, carb: 0, fat: 0, protein: 0, fiber: 0 };
      items.forEach(it => {
        const n = this.compute(it.food, it.quantity, it.mode);
        r.calories += n.calories;
        r.carb += n.carb;
        r.fat += n.fat;
        r.protein += n.protein;
        r.fiber += n.fiber;
      });
      return roundAll(r);
    },

    /** 計算全部總計 */
    total() {
      const r = { calories: 0, carb: 0, fat: 0, protein: 0, fiber: 0 };
      state.groupOrder.forEach(g => {
        const items = state.groups[g] || [];
        items.forEach(it => {
          const n = this.compute(it.food, it.quantity, it.mode);
          r.calories += n.calories;
          r.carb += n.carb;
          r.fat += n.fat;
          r.protein += n.protein;
          r.fiber += n.fiber;
        });
      });
      return roundAll(r);
    },
  };

  function num(v) { return parseFloat(v) || 0; }
  function round(v) { return Math.round(v * 10) / 10; }
  function roundAll(obj) {
    for (const k in obj) obj[k] = round(obj[k]);
    return obj;
  }

  // ── Export ────────────────────────────────────────
  const Export = {
    generate() {
      const lines = [];
      state.groupOrder.forEach(g => {
        const items = state.groups[g] || [];
        if (items.length === 0) return;
        lines.push(`[${g}]`);
        items.forEach(it => {
          const n = Calc.compute(it.food, it.quantity, it.mode);
          const name = it.food['名稱'] || '';
          lines.push(`- ${name} ${n.grams}g - ${n.calories} kcal`);
        });
        const sub = Calc.subtotal(items);
        lines.push(`小計：${sub.calories} kcal | 碳水 ${sub.carb}g | 蛋白質 ${sub.protein}g | 脂肪 ${sub.fat}g`);
        lines.push('');
      });

      const t = Calc.total();
      if (t.calories > 0) {
        const totalMacro = t.carb * 4 + t.protein * 4 + t.fat * 9;
        const cp = totalMacro > 0 ? Math.round(t.carb * 4 / totalMacro * 100) : 0;
        const pp = totalMacro > 0 ? Math.round(t.protein * 4 / totalMacro * 100) : 0;
        const fp = totalMacro > 0 ? 100 - cp - pp : 0;
        lines.push(`總計：${t.calories} kcal`);
        lines.push(`碳水 ${t.carb}g (${cp}%) | 蛋白質 ${t.protein}g (${pp}%) | 脂肪 ${t.fat}g (${fp}%)`);
      }
      return lines.join('\n');
    },
  };

  // ── DOM References ────────────────────────────────
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const DOM = {
    settingsOverlay: $('#settings-overlay'),
    inputApiUrl: $('#input-api-url'),
    inputToken: $('#input-token'),
    setupNotice: $('#setup-notice'),
    loading: $('#loading'),
    searchInput: $('#input-search'),
    searchClear: $('#btn-clear-search'),
    searchResults: $('#search-results'),
    recentSection: $('#recent-section'),
    recentList: $('#recent-list'),
    addFoodOverlay: $('#add-food-overlay'),
    addFoodTitle: $('#add-food-title'),
    addFoodInfo: $('#add-food-info'),
    btnModeGram: $('#btn-mode-gram'),
    btnModeServing: $('#btn-mode-serving'),
    inputQuantity: $('#input-quantity'),
    qtyUnit: $('#qty-unit'),
    nutritionPreview: $('#nutrition-preview'),
    selectGroup: $('#select-group'),
    groupTabs: $('#group-tabs'),
    groupItems: $('#group-items'),
    groupSubtotal: $('#group-subtotal'),
    totalSection: $('#total-section'),
    totalCalories: $('#total-calories'),
    macroBar: $('#macro-bar'),
    macroDetails: $('#macro-details'),
    presetsOverlay: $('#presets-overlay'),
    presetsList: $('#presets-list'),
    exportOverlay: $('#export-overlay'),
    exportText: $('#export-text'),
    toast: $('#toast'),
    btnImport: $('#btn-import'),
    importOverlay: $('#import-overlay'),
    importDate: $('#input-import-date'),
    importLoading: $('#import-loading'),
    importRecords: $('#import-records'),
    btnImportConfirm: $('#btn-import-confirm'),
    mealBar: $('#meal-bar'),
    mealDetails: $('#meal-details'),
  };

  // ── Add-food modal state ──────────────────────────
  let addFoodState = { food: null, mode: 'gram', quantity: 100 };

  // ── UI Rendering ──────────────────────────────────
  const UI = {
    init() {
      this.bindEvents();
      Config.loadState();
      Config.loadRecent();
      Config.loadPresets();

      // 初始化群組
      if (state.groupOrder.length === 0) {
        state.groupOrder = [...DEFAULT_GROUPS];
        state.groups = {};
        DEFAULT_GROUPS.forEach(g => state.groups[g] = []);
        state.activeGroup = state.groupOrder[0];
      }

      // 有 token 時顯示匯入按鈕
      if (Config.isConfigured) {
        DOM.btnImport.classList.remove('hidden');
      }

      this.loadFoods();

      this.renderTabs();
      this.renderGroupItems();
      this.renderTotal();
      this.renderRecent();
      lucide.createIcons();
    },

    bindEvents() {
      // Settings
      $('#btn-settings').addEventListener('click', () => this.openSettings());
      $('#btn-settings-close').addEventListener('click', () => this.closeSettings());
      $('#btn-settings-save').addEventListener('click', () => this.saveSettings());
      $('#btn-open-settings').addEventListener('click', () => this.openSettings());

      // Refresh
      $('#btn-refresh').addEventListener('click', () => this.loadFoods(true));

      // Search
      DOM.searchInput.addEventListener('input', debounce(() => this.onSearch(), 200));
      DOM.searchInput.addEventListener('focus', () => this.onSearchFocus());
      DOM.searchClear.addEventListener('click', () => this.clearSearch());

      // Add food modal
      $('#btn-add-food-close').addEventListener('click', () => this.closeAddFood());
      DOM.btnModeGram.addEventListener('click', () => this.setInputMode('gram'));
      DOM.btnModeServing.addEventListener('click', () => this.setInputMode('serving'));
      $('#btn-qty-minus').addEventListener('click', () => this.adjustQty(-1));
      $('#btn-qty-plus').addEventListener('click', () => this.adjustQty(1));
      DOM.inputQuantity.addEventListener('input', () => this.onQtyChange());
      $('#btn-add-confirm').addEventListener('click', () => this.confirmAddFood());


      // Recent editing
      $('#btn-recent-edit').addEventListener('click', () => this.toggleRecentEdit(true));
      $('#btn-recent-done').addEventListener('click', () => this.toggleRecentEdit(false));
      $('#btn-recent-clear-all').addEventListener('click', () => this.clearAllRecent());

      // Preset save modal
      $('#btn-preset-save-close').addEventListener('click', () => $('#preset-save-overlay').classList.add('hidden'));
      $('#btn-preset-save-div-minus').addEventListener('click', () => this.adjustPresetSaveDivider(-1));
      $('#btn-preset-save-div-plus').addEventListener('click', () => this.adjustPresetSaveDivider(1));
      $('#input-preset-divider').addEventListener('input', () => this.updatePresetSavePreview());
      $('#btn-preset-save-confirm').addEventListener('click', () => this.confirmSavePreset());

      // Preset use modal
      $('#btn-preset-use-close').addEventListener('click', () => $('#preset-use-overlay').classList.add('hidden'));
      $('#btn-preset-use-confirm').addEventListener('click', () => this.confirmUsePreset());

      // Groups
      $('#btn-add-group').addEventListener('click', () => this.addGroup());

      // Footer actions
      $('#btn-presets').addEventListener('click', () => this.openPresets());
      DOM.btnImport.addEventListener('click', () => this.openImport());
      $('#btn-export').addEventListener('click', () => this.openExport());
      $('#btn-clear-current').addEventListener('click', () => this.clearCurrent());
      $('#btn-clear-all').addEventListener('click', () => this.clearAll());

      // Import
      $('#btn-import-close').addEventListener('click', () => this.closeImport());
      $('#btn-import-query').addEventListener('click', () => this.queryImport());
      DOM.btnImportConfirm.addEventListener('click', () => this.confirmImport());

      // Presets
      $('#btn-presets-close').addEventListener('click', () => this.closePresets());
      $('#btn-save-preset').addEventListener('click', () => this.savePreset());

      // Export
      $('#btn-export-close').addEventListener('click', () => this.closeExport());
      $('#btn-copy').addEventListener('click', () => this.copyExport());

      // Close overlays on backdrop click
      [DOM.settingsOverlay, DOM.addFoodOverlay, DOM.presetsOverlay, DOM.exportOverlay,
      DOM.importOverlay, $('#preset-save-overlay'), $('#preset-use-overlay'), $('#input-overlay'), $('#confirm-overlay')].forEach(el => {
        el.addEventListener('click', (e) => {
          if (e.target === el) el.classList.add('hidden');
        });
      });

      // Close search results on outside click
      document.addEventListener('click', (e) => {
        if (!e.target.closest('#search-section')) {
          DOM.searchResults.classList.add('hidden');
        }
      });
    },

    // ── Settings ──
    openSettings() {
      DOM.inputApiUrl.value = Config.apiUrl;
      DOM.inputToken.value = Config.token;
      DOM.settingsOverlay.classList.remove('hidden');
    },

    closeSettings() {
      DOM.settingsOverlay.classList.add('hidden');
    },

    saveSettings() {
      const url = DOM.inputApiUrl.value.trim();
      const token = DOM.inputToken.value.trim();
      if (!url || !token) {
        toast('請填寫 API URL 和 TOKEN');
        return;
      }
      Config.apiUrl = url;
      Config.token = token;
      this.closeSettings();
      DOM.setupNotice.classList.add('hidden');
      DOM.btnImport.classList.toggle('hidden', !Config.isConfigured);
      toast('設定已儲存');
      this.loadFoods(true);
    },

    // ── Load Foods ──
    async loadFoods(forceRefresh = false) {
      // 嘗試從快取載入
      if (!forceRefresh) {
        const cached = Config.loadCache();
        if (cached && cached.length > 0) {
          state.foods = cached;
          state.useMock = false;
          return;
        }
      }

      DOM.loading.classList.remove('hidden');
      try {
        if (Config.isConfigured) {
          // 從 API 載入
          const foods = await API.fetchFoods();
          state.foods = foods;
          state.useMock = false;
          Config.saveCache(foods);
          toast(`已載入 ${foods.length} 筆食材`);
        } else {
          // 未設定 API，使用預設資料庫
          const foods = await API.fetchDefaultFoods();
          state.foods = foods;
          state.useMock = false;
          toast(`已載入預設資料庫 (${foods.length} 筆)`);
        }
      } catch (err) {
        console.error('載入失敗:', err);
        // fallback: 快取 → 預設資料庫
        const cached = Config.loadCache();
        if (cached && cached.length > 0) {
          state.foods = cached;
          state.useMock = false;
          toast('載入失敗，使用快取資料');
        } else {
          try {
            const foods = await API.fetchDefaultFoods();
            state.foods = foods;
            state.useMock = false;
            toast(`使用預設資料庫 (${foods.length} 筆)`);
          } catch (e2) {
            state.foods = [];
            state.useMock = false;
            toast('載入失敗，請檢查設定');
          }
        }
      } finally {
        DOM.loading.classList.add('hidden');
      }
    },

    // ── Search ──
    onSearchFocus() {
      const v = DOM.searchInput.value.trim();
      if (v.length > 0) this.onSearch();
    },

    onSearch() {
      const v = DOM.searchInput.value.trim();
      DOM.searchClear.classList.toggle('hidden', v.length === 0);

      if (v.length === 0) {
        DOM.searchResults.classList.add('hidden');
        return;
      }

      const results = Search.query(v);
      if (results.length === 0) {
        DOM.searchResults.innerHTML = '<li class="dropdown-item"><span class="dropdown-item-name">查無結果</span></li>';
      } else {
        DOM.searchResults.innerHTML = results.map((f, i) => {
          const brand = f['品牌'] ? `${f['品牌']} ` : '';
          const cal100 = num(f['每 100g 熱量']);
          return `<li class="dropdown-item" data-idx="${i}">
            <div class="dropdown-item-name">${brand}${f['名稱'] || ''}</div>
            <div class="dropdown-item-meta">${f['分類'] || ''} · ${cal100} kcal/100g · 每份 ${f['每份量(g)'] || '?'}g</div>
          </li>`;
        }).join('');

        DOM.searchResults.querySelectorAll('.dropdown-item').forEach((el, i) => {
          if (results[i]) {
            el.addEventListener('click', () => this.openAddFood(results[i]));
          }
        });
      }
      DOM.searchResults.classList.remove('hidden');
    },

    clearSearch() {
      DOM.searchInput.value = '';
      DOM.searchClear.classList.add('hidden');
      DOM.searchResults.classList.add('hidden');
    },

    // ── Recent ──
    renderRecent(editing) {
      const isEditing = editing === true;
      if (state.recent.length === 0) {
        DOM.recentSection.classList.add('hidden');
        return;
      }
      DOM.recentSection.classList.remove('hidden');

      // Toggle edit buttons
      $('#btn-recent-edit').classList.toggle('hidden', isEditing);
      $('#btn-recent-clear-all').classList.toggle('hidden', !isEditing);
      $('#btn-recent-done').classList.toggle('hidden', !isEditing);

      DOM.recentList.innerHTML = state.recent.map((name, i) => {
        const removeBtn = isEditing ? `<span class="chip-remove" data-idx="${i}"><i data-lucide="x"></i></span>` : '';
        return `<button class="recent-chip" data-idx="${i}">${name}${removeBtn}</button>`;
      }).join('');

      if (isEditing) {
        // Individual delete
        DOM.recentList.querySelectorAll('.chip-remove').forEach(el => {
          el.addEventListener('click', (e) => {
            e.stopPropagation();
            const idx = parseInt(el.dataset.idx);
            state.recent.splice(idx, 1);
            Config.saveRecent();
            this.renderRecent(true);
          });
        });
      } else {
        // Click to open food
        DOM.recentList.querySelectorAll('.recent-chip').forEach(el => {
          el.addEventListener('click', () => {
            const name = state.recent[parseInt(el.dataset.idx)];
            const food = state.foods.find(f => f['名稱'] === name);
            if (food) this.openAddFood(food);
          });
        });
      }
    },

    toggleRecentEdit(editing) {
      this.renderRecent(editing);
    },

    clearAllRecent() {
      state.recent = [];
      Config.saveRecent();
      this.renderRecent(false);
    },

    addToRecent(food) {
      const name = food['名稱'];
      state.recent = state.recent.filter(n => n !== name);
      state.recent.unshift(name);
      if (state.recent.length > 10) state.recent = state.recent.slice(0, 10);
      Config.saveRecent();
      this.renderRecent();
    },

    // ── Add Food Modal ──
    openAddFood(food) {
      addFoodState = { food, mode: 'gram', quantity: 100 };
      DOM.addFoodTitle.textContent = food['名稱'] || '添加食材';
      const brand = food['品牌'] ? `品牌：${food['品牌']}<br>` : '';
      DOM.addFoodInfo.innerHTML = `${brand}分類：${food['分類'] || '-'} · 每份 ${food['每份量(g)'] || '?'}g`;

      DOM.btnModeGram.classList.add('active');
      DOM.btnModeServing.classList.remove('active');
      DOM.inputQuantity.value = 100;
      DOM.inputQuantity.step = 10;
      DOM.qtyUnit.textContent = 'g';

      // 填充群組選單
      DOM.selectGroup.innerHTML = state.groupOrder.map(g =>
        `<option value="${g}" ${g === state.activeGroup ? 'selected' : ''}>${g}</option>`
      ).join('');

      this.updateNutritionPreview();
      DOM.searchResults.classList.add('hidden');
      DOM.addFoodOverlay.classList.remove('hidden');
    },

    closeAddFood() {
      DOM.addFoodOverlay.classList.add('hidden');
    },

    setInputMode(mode) {
      addFoodState.mode = mode;
      if (mode === 'gram') {
        DOM.btnModeGram.classList.add('active');
        DOM.btnModeServing.classList.remove('active');
        DOM.inputQuantity.value = 100;
        DOM.inputQuantity.step = 10;
        DOM.qtyUnit.textContent = 'g';
        addFoodState.quantity = 100;
      } else {
        DOM.btnModeServing.classList.add('active');
        DOM.btnModeGram.classList.remove('active');
        DOM.inputQuantity.value = 1;
        DOM.inputQuantity.step = 0.5;
        DOM.qtyUnit.textContent = '份';
        addFoodState.quantity = 1;
      }
      this.updateNutritionPreview();
    },

    adjustQty(dir) {
      const step = addFoodState.mode === 'gram' ? 10 : 0.5;
      let v = parseFloat(DOM.inputQuantity.value) || 0;
      v = Math.max(0, v + step * dir);
      DOM.inputQuantity.value = v;
      addFoodState.quantity = v;
      this.updateNutritionPreview();
    },

    onQtyChange() {
      addFoodState.quantity = parseFloat(DOM.inputQuantity.value) || 0;
      this.updateNutritionPreview();
    },

    updateNutritionPreview() {
      const n = Calc.compute(addFoodState.food, addFoodState.quantity, addFoodState.mode);
      DOM.nutritionPreview.innerHTML = `
        <div class="nutrition-preview-item"><span class="nutrition-preview-label">熱量</span><span class="nutrition-preview-value">${n.calories} kcal</span></div>
        <div class="nutrition-preview-item"><span class="nutrition-preview-label">碳水</span><span class="nutrition-preview-value">${n.carb}g</span></div>
        <div class="nutrition-preview-item"><span class="nutrition-preview-label">蛋白質</span><span class="nutrition-preview-value">${n.protein}g</span></div>
        <div class="nutrition-preview-item"><span class="nutrition-preview-label">脂肪</span><span class="nutrition-preview-value">${n.fat}g</span></div>
        <div class="nutrition-preview-item"><span class="nutrition-preview-label">膳食纖維</span><span class="nutrition-preview-value">${n.fiber}g</span></div>
        <div class="nutrition-preview-item"><span class="nutrition-preview-label">重量</span><span class="nutrition-preview-value">${n.grams}g</span></div>
      `;
    },

    confirmAddFood() {
      const food = addFoodState.food;
      const quantity = addFoodState.quantity;
      const mode = addFoodState.mode;
      const group = DOM.selectGroup.value;

      if (quantity <= 0) {
        toast('請輸入數量');
        return;
      }

      if (!state.groups[group]) state.groups[group] = [];
      state.groups[group].push({ food, quantity, mode });

      state.activeGroup = group;
      this.addToRecent(food);
      Config.saveState();

      this.closeAddFood();
      this.clearSearch();
      this.renderTabs();
      this.renderGroupItems();
      this.renderTotal();
      toast(`已加入 ${food['名稱']} 到 ${group}`);
    },

    // ── Tabs ──
    renderTabs() {
      DOM.groupTabs.innerHTML = state.groupOrder.map(g => {
        const count = (state.groups[g] || []).length;
        const countHtml = count > 0 ? `<span class="tab-count">(${count})</span>` : '';
        return `<button class="tab ${g === state.activeGroup ? 'active' : ''}" data-group="${g}">${g}${countHtml}</button>`;
      }).join('');

      DOM.groupTabs.querySelectorAll('.tab').forEach(el => {
        el.addEventListener('click', () => {
          state.activeGroup = el.dataset.group;
          Config.saveState();
          this.renderTabs();
          this.renderGroupItems();
        });

        // Long press to rename/delete
        let pressTimer;
        el.addEventListener('touchstart', (e) => {
          pressTimer = setTimeout(() => this.groupContextMenu(el.dataset.group), 600);
        }, { passive: true });
        el.addEventListener('touchend', () => clearTimeout(pressTimer));
        el.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          this.groupContextMenu(el.dataset.group);
        });
      });
    },

    groupContextMenu(groupName) {
      showPrompt(`群組「${groupName}」`, '輸入新名稱以重新命名，或輸入 "delete" 刪除').then(action => {
        if (action === null) return;
        if (action.toLowerCase() === 'delete') {
          if (state.groupOrder.length <= 1) {
            toast('至少需要一個群組');
            return;
          }
          delete state.groups[groupName];
          state.groupOrder = state.groupOrder.filter(g => g !== groupName);
          if (state.activeGroup === groupName) state.activeGroup = state.groupOrder[0];
          Config.saveState();
          this.renderTabs();
          this.renderGroupItems();
          this.renderTotal();
          toast(`已刪除「${groupName}」`);
        } else if (action.trim()) {
          const newName = action.trim();
          if (state.groups[newName]) {
            toast('群組名稱已存在');
            return;
          }
          state.groups[newName] = state.groups[groupName] || [];
          delete state.groups[groupName];
          state.groupOrder = state.groupOrder.map(g => g === groupName ? newName : g);
          if (state.activeGroup === groupName) state.activeGroup = newName;
          Config.saveState();
          this.renderTabs();
          this.renderGroupItems();
          toast(`已重新命名為「${newName}」`);
        }
      });
    },

    addGroup() {
      showPrompt('新增群組', '').then(name => {
        if (!name || !name.trim()) return;
        const n = name.trim();
        if (state.groups[n]) {
          toast('群組名稱已存在');
          return;
        }
        state.groups[n] = [];
        state.groupOrder.push(n);
        state.activeGroup = n;
        Config.saveState();
        this.renderTabs();
        this.renderGroupItems();
        toast(`已新增「${n}」`);
      });
    },

    // ── Group Items ──
    renderGroupItems() {
      const items = state.groups[state.activeGroup] || [];

      if (items.length === 0) {
        DOM.groupItems.innerHTML = '<div class="group-empty">尚未加入食材，請搜尋並添加</div>';
        DOM.groupSubtotal.classList.add('hidden');
        return;
      }

      DOM.groupItems.innerHTML = items.map((it, i) => {
        const n = Calc.compute(it.food, it.quantity, it.mode);
        const name = it.food['名稱'] || '';
        const detail = it.mode === 'gram' ? `${n.grams}g` : `${it.quantity}份 (${n.grams}g)`;
        return `<div class="food-item" data-idx="${i}">
          <div class="food-item-info">
            <div class="food-item-name">${name}</div>
            <div class="food-item-detail">${detail} · 碳${n.carb} 蛋${n.protein} 脂${n.fat}</div>
          </div>
          <div class="food-item-cal">${n.calories} kcal</div>
          <button class="icon-btn food-item-remove" data-idx="${i}"><i data-lucide="x"></i></button>
        </div>`;
      }).join('');

      // Remove buttons
      DOM.groupItems.querySelectorAll('.food-item-remove').forEach(el => {
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          const idx = parseInt(el.dataset.idx);
          items.splice(idx, 1);
          Config.saveState();
          this.renderTabs();
          this.renderGroupItems();
          this.renderTotal();
        });
      });

      // Subtotal
      const sub = Calc.subtotal(items);
      DOM.groupSubtotal.classList.remove('hidden');
      DOM.groupSubtotal.innerHTML = `
        <span class="subtotal-item">熱量 <span class="subtotal-value">${sub.calories}</span> kcal</span>
        <span class="subtotal-item">碳水 <span class="subtotal-value">${sub.carb}</span>g</span>
        <span class="subtotal-item">蛋白質 <span class="subtotal-value">${sub.protein}</span>g</span>
        <span class="subtotal-item">脂肪 <span class="subtotal-value">${sub.fat}</span>g</span>
        <span class="subtotal-item">纖維 <span class="subtotal-value">${sub.fiber}</span>g</span>
      `;
    },

    // ── Total ──
    renderTotal() {
      const t = Calc.total();
      const hasItems = t.calories > 0;
      DOM.totalSection.classList.toggle('hidden', !hasItems);
      if (!hasItems) return;

      const macroChart = $('#macro-chart');
      const mealChart = $('#meal-chart');

      // === Macro Donut Chart ===
      const totalMacro = t.carb * 4 + t.protein * 4 + t.fat * 9;
      const cp = totalMacro > 0 ? Math.round(t.carb * 4 / totalMacro * 100) : 0;
      const pp = totalMacro > 0 ? Math.round(t.protein * 4 / totalMacro * 100) : 0;
      const fp = totalMacro > 0 ? 100 - cp - pp : 0;

      // 產生 conic-gradient (碳水 -> 蛋白質 -> 脂肪)
      let conicMacro = `var(--c-surface) 0deg, var(--c-surface) 360deg`;
      if (totalMacro > 0) {
        const deg1 = Math.round(cp * 3.6);
        const deg2 = deg1 + Math.round(pp * 3.6);
        conicMacro = `
          var(--c-carb) 0deg ${deg1}deg,
          var(--c-protein) ${deg1}deg ${deg2}deg,
          var(--c-fat) ${deg2}deg 360deg
        `;
      }

      macroChart.innerHTML = `
        <div class="donut-chart" style="background: conic-gradient(${conicMacro})"></div>
        <div class="donut-text">
          <span class="donut-cal">${t.calories}</span>
          <span class="donut-unit">kcal</span>
        </div>
      `;

      DOM.macroDetails.innerHTML = `
        <div class="macro-item">
          <span class="macro-dot" style="background:var(--c-carb)"></span>
          <span class="macro-label">碳水</span>
          <span class="macro-value">${t.carb}g</span>
          <span class="macro-percent">${cp}%</span>
        </div>
        <div class="macro-item">
          <span class="macro-dot" style="background:var(--c-protein)"></span>
          <span class="macro-label">蛋白質</span>
          <span class="macro-value">${t.protein}g</span>
          <span class="macro-percent">${pp}%</span>
        </div>
        <div class="macro-item">
          <span class="macro-dot" style="background:var(--c-fat)"></span>
          <span class="macro-label">脂肪</span>
          <span class="macro-value">${t.fat}g</span>
          <span class="macro-percent">${fp}%</span>
        </div>
        <div class="macro-item">
          <span class="macro-dot" style="background:var(--c-fiber)"></span>
          <span class="macro-label">纖維</span>
          <span class="macro-value">${t.fiber}g</span>
          <span class="macro-percent"></span>
        </div>
      `;

      // === Meal Donut Chart ===
      const mealColors = ['#7C9EDE', '#F4C454', '#F08CA5', '#8ECA99', '#BCA0E6', '#F4A674', '#78C4CD', '#D990B0'];
      const mealData = [];
      state.groupOrder.forEach((g, i) => {
        const items = state.groups[g] || [];
        if (items.length === 0) return;
        const sub = Calc.subtotal(items);
        mealData.push({ name: g, cal: sub.calories, color: mealColors[i % mealColors.length] });
      });

      if (mealData.length > 0) {
        let currentDeg = 0;
        const stops = [];
        mealData.forEach(m => {
          const pct = t.calories > 0 ? (m.cal / t.calories * 100) : 0;
          const deg = Math.round(pct * 3.6);
          stops.push(`${m.color} ${currentDeg}deg ${currentDeg + deg}deg`);
          currentDeg += deg;
        });

        // 填滿最後的剩餘度數，避免浮點數誤差
        if (stops.length > 0) {
          const lastStop = stops[stops.length - 1];
          stops[stops.length - 1] = lastStop.replace(/\d+deg$/, '360deg');
        }

        const conicMeal = stops.length > 0 ? stops.join(', ') : `var(--c-surface) 0deg, var(--c-surface) 360deg`;

        mealChart.innerHTML = `
          <div class="donut-chart" style="background: conic-gradient(${conicMeal})"></div>
          <div class="donut-text">
            <span class="donut-cal">餐點</span>
            <span class="donut-unit">分佈</span>
          </div>
        `;

        DOM.mealDetails.innerHTML = mealData.map(m => {
          const pct = t.calories > 0 ? Math.round(m.cal / t.calories * 100) : 0;
          return `<div class="macro-item">
            <span class="macro-dot" style="background:${m.color}"></span>
            <span class="macro-label">${m.name}</span>
            <span class="macro-value">${m.cal} kcal</span>
            <span class="macro-percent">${pct}%</span>
          </div>`;
        }).join('');
      } else {
        mealChart.innerHTML = '';
        DOM.mealDetails.innerHTML = '';
      }
    },

    // ── Presets ──
    openPresets() {
      this.renderPresetsList();
      DOM.presetsOverlay.classList.remove('hidden');
    },

    closePresets() {
      DOM.presetsOverlay.classList.add('hidden');
    },

    renderPresetsList() {
      if (state.presets.length === 0) {
        DOM.presetsList.innerHTML = '<div class="presets-empty">尚無常用組合</div>';
        return;
      }
      DOM.presetsList.innerHTML = state.presets.map((p, i) => {
        const foods = p.items.map(it => it.food['名稱']).join('、');
        const divInfo = p.divider && p.divider > 1 ? ` <span style="color:var(--c-text-secondary)">(÷${p.divider})</span>` : '';
        return `<div class="preset-card">
          <div class="preset-header">
            <span class="preset-name">${p.name}${divInfo}</span>
            <div class="preset-actions">
              <input type="number" class="input preset-qty-input" data-preset-qty="${i}" value="1" min="1" step="1">
              <button class="btn" data-preset-use="${i}">加入</button>
              <button class="icon-btn food-item-remove" data-preset-del="${i}"><i data-lucide="x"></i></button>
            </div>
          </div>
          <div class="preset-foods">${foods}</div>
        </div>`;
      }).join('');

      DOM.presetsList.querySelectorAll('[data-preset-use]').forEach(el => {
        el.addEventListener('click', () => {
          const idx = parseInt(el.dataset.presetUse);
          const qtyInput = DOM.presetsList.querySelector(`[data-preset-qty="${idx}"]`);
          const qty = Math.max(1, parseInt(qtyInput?.value) || 1);
          this.usePreset(idx, qty);
        });
      });

      DOM.presetsList.querySelectorAll('[data-preset-del]').forEach(el => {
        el.addEventListener('click', () => {
          const idx = parseInt(el.dataset.presetDel);
          state.presets.splice(idx, 1);
          Config.savePresets();
          this.renderPresetsList();
          toast('已刪除常用組合');
        });
      });
    },

    usePreset(idx, qty) {
      const preset = state.presets[idx];
      if (!preset) return;
      this._pendingPreset = preset;
      this._pendingPresetQty = qty || 1;
      this.closePresets();

      // 顯示使用彈窗，顯示每份營養
      const divider = preset.divider || 1;
      const multiplier = this._pendingPresetQty;
      $('#preset-use-title').textContent = preset.name + (multiplier > 1 ? ` ×${multiplier}` : '');
      const divLabel = divider > 1 ? ` (÷${divider})` : '';
      $('#preset-use-foods').innerHTML = preset.items.map(it => {
        const name = it.food['名稱'] || '';
        const qty = round(it.quantity / divider * multiplier);
        return `${name} ${qty}${it.mode === 'gram' ? 'g' : '份'}`;
      }).join('、') + divLabel;

      // 預覽每份營養
      const totals = { calories: 0, carb: 0, protein: 0, fat: 0, fiber: 0 };
      preset.items.forEach(it => {
        const n = Calc.compute(it.food, it.quantity, it.mode);
        totals.calories += n.calories / divider * multiplier;
        totals.carb += n.carb / divider * multiplier;
        totals.protein += n.protein / divider * multiplier;
        totals.fat += n.fat / divider * multiplier;
        totals.fiber += n.fiber / divider * multiplier;
      });
      $('#preset-use-preview').innerHTML = `
        <div class="nutrition-preview-item"><span class="nutrition-preview-label">熱量</span><span class="nutrition-preview-value">${round(totals.calories)} kcal</span></div>
        <div class="nutrition-preview-item"><span class="nutrition-preview-label">碳水</span><span class="nutrition-preview-value">${round(totals.carb)}g</span></div>
        <div class="nutrition-preview-item"><span class="nutrition-preview-label">蛋白質</span><span class="nutrition-preview-value">${round(totals.protein)}g</span></div>
        <div class="nutrition-preview-item"><span class="nutrition-preview-label">脂肪</span><span class="nutrition-preview-value">${round(totals.fat)}g</span></div>
      `;
      $('#preset-use-overlay').classList.remove('hidden');
    },

    confirmUsePreset() {
      const preset = this._pendingPreset;
      if (!preset) return;
      const divider = preset.divider || 1;
      const multiplier = this._pendingPresetQty || 1;
      const group = state.activeGroup;
      if (!state.groups[group]) state.groups[group] = [];
      preset.items.forEach(it => {
        state.groups[group].push({
          food: it.food,
          quantity: round(it.quantity / divider * multiplier),
          mode: it.mode,
        });
      });
      Config.saveState();
      $('#preset-use-overlay').classList.add('hidden');
      this.renderTabs();
      this.renderGroupItems();
      this.renderTotal();
      let label = divider > 1 ? ` ÷${divider}` : '';
      if (multiplier > 1) label += ` ×${multiplier}`;
      toast(`已加入「${preset.name}」${label} 到 ${group}`);
    },

    // ── Save Preset ──
    savePreset() {
      const items = state.groups[state.activeGroup] || [];
      if (items.length === 0) {
        toast('當前群組沒有食材');
        return;
      }
      this._savePresetItems = items;
      $('#input-preset-name').value = '';
      $('#input-preset-divider').value = 1;
      this.updatePresetSavePreview();
      $('#preset-save-overlay').classList.remove('hidden');
      $('#input-preset-name').focus();
    },

    adjustPresetSaveDivider(dir) {
      const el = $('#input-preset-divider');
      let v = parseInt(el.value) || 1;
      v = Math.max(1, v + dir);
      el.value = v;
      this.updatePresetSavePreview();
    },

    updatePresetSavePreview() {
      const items = this._savePresetItems;
      if (!items) return;
      const divider = Math.max(1, parseInt($('#input-preset-divider').value) || 1);
      const totals = { calories: 0, carb: 0, protein: 0, fat: 0, fiber: 0 };
      items.forEach(it => {
        const n = Calc.compute(it.food, it.quantity, it.mode);
        totals.calories += n.calories / divider;
        totals.carb += n.carb / divider;
        totals.protein += n.protein / divider;
        totals.fat += n.fat / divider;
        totals.fiber += n.fiber / divider;
      });
      const label = divider > 1 ? `（每份）` : '';
      $('#preset-save-preview').innerHTML = `
        <div class="nutrition-preview-item"><span class="nutrition-preview-label">熱量${label}</span><span class="nutrition-preview-value">${round(totals.calories)} kcal</span></div>
        <div class="nutrition-preview-item"><span class="nutrition-preview-label">碳水</span><span class="nutrition-preview-value">${round(totals.carb)}g</span></div>
        <div class="nutrition-preview-item"><span class="nutrition-preview-label">蛋白質</span><span class="nutrition-preview-value">${round(totals.protein)}g</span></div>
        <div class="nutrition-preview-item"><span class="nutrition-preview-label">脂肪</span><span class="nutrition-preview-value">${round(totals.fat)}g</span></div>
      `;
    },

    confirmSavePreset() {
      const name = $('#input-preset-name').value.trim();
      if (!name) {
        toast('請輸入組合名稱');
        return;
      }
      const divider = Math.max(1, parseInt($('#input-preset-divider').value) || 1);
      const items = this._savePresetItems;
      state.presets.push({
        name,
        divider,
        items: items.map(it => ({ food: it.food, quantity: it.quantity, mode: it.mode })),
      });
      Config.savePresets();
      $('#preset-save-overlay').classList.add('hidden');
      this.renderPresetsList();
      const label = divider > 1 ? ` (÷${divider})` : '';
      toast(`已儲存「${name}」${label}`);
    },

    // ── Import ──
    openImport() {
      // 預設日期為今天
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      DOM.importDate.value = `${yyyy}-${mm}-${dd}`;
      DOM.importRecords.innerHTML = '';
      DOM.btnImportConfirm.classList.add('hidden');
      DOM.importLoading.classList.add('hidden');
      state._importData = null;
      DOM.importOverlay.classList.remove('hidden');
    },

    closeImport() {
      DOM.importOverlay.classList.add('hidden');
    },

    async queryImport() {
      const dateVal = DOM.importDate.value;
      if (!dateVal) { toast('請選擇日期'); return; }

      // 轉換日期格式 yyyy-MM-dd → yyyy/MM/dd
      const dateStr = dateVal.replace(/-/g, '/');

      DOM.importLoading.classList.remove('hidden');
      DOM.importRecords.innerHTML = '';
      DOM.btnImportConfirm.classList.add('hidden');

      try {
        const data = await API.fetchDiet(dateStr);
        const records = data.records || [];

        if (records.length === 0) {
          DOM.importRecords.innerHTML = '<div class="import-empty">該日無飲食記錄</div>';
          state._importData = null;
        } else {
          state._importData = records;
          // 依餐別分組顯示
          const grouped = {};
          records.forEach(r => {
            const meal = r['餐別'] || '其他';
            if (!grouped[meal]) grouped[meal] = [];
            grouped[meal].push(r);
          });

          let html = '';
          for (const [meal, items] of Object.entries(grouped)) {
            html += `<div class="import-meal-group">`;
            html += `<div class="import-meal-label">${meal}</div>`;
            items.forEach(r => {
              const name = r['食品名稱'] || '';
              const qty = r['份量'] || '';
              const unit = r['單位'] || '';
              const cal = r['熱量'] || 0;
              html += `<div class="import-record-item">
                <div class="import-record-info">
                  <div class="import-record-name">${name}</div>
                  <div class="import-record-detail">${qty}${unit} · 碳${r['碳水'] || 0} 蛋${r['蛋白質'] || 0} 脂${r['脂肪'] || 0}</div>
                </div>
                <div class="import-record-cal">${cal} kcal</div>
              </div>`;
            });
            html += `</div>`;
          }

          // 總計
          const totalCal = records.reduce((s, r) => s + (parseFloat(r['熱量']) || 0), 0);
          html += `<div class="import-total">共 ${records.length} 筆，合計 ${Math.round(totalCal)} kcal</div>`;

          DOM.importRecords.innerHTML = html;
          DOM.btnImportConfirm.classList.remove('hidden');
        }
      } catch (err) {
        console.error('查詢飲食記錄失敗:', err);
        DOM.importRecords.innerHTML = '<div class="import-empty">查詢失敗，請檢查設定</div>';
        state._importData = null;
      } finally {
        DOM.importLoading.classList.add('hidden');
      }
    },

    confirmImport() {
      const records = state._importData;
      if (!records || records.length === 0) return;

      let importCount = 0;
      records.forEach(r => {
        // 決定群組，餐別對應到群組名稱
        const meal = r['餐別'] || '其他';
        // 確保群組存在
        if (!state.groups[meal]) {
          state.groups[meal] = [];
          if (!state.groupOrder.includes(meal)) state.groupOrder.push(meal);
        }

        // 嘗試比對已有食材
        const foodName = r['食品名稱'] || '';
        let food = state.foods.find(f => f['名稱'] === foodName);

        if (food) {
          // 比對到已有食材，使用克數模式
          const qty = parseFloat(r['份量']) || 100;
          const unit = r['單位'] || '';
          if (unit === '份') {
            state.groups[meal].push({ food, quantity: qty, mode: 'serving' });
          } else {
            state.groups[meal].push({ food, quantity: qty, mode: 'gram' });
          }
        } else {
          // 未比對到，使用 API 回傳的營養數據建立 inline food 物件
          const cal = parseFloat(r['熱量']) || 0;
          const protein = parseFloat(r['蛋白質']) || 0;
          const fat = parseFloat(r['脂肪']) || 0;
          const carb = parseFloat(r['碳水']) || 0;
          const qty = parseFloat(r['份量']) || 1;

          food = {
            '名稱': foodName,
            '分類': '',
            '品牌': '',
            '別名': '',
            '每份量(g)': qty,
            '每份熱量': cal,
            '每份碳水': carb,
            '每份脂肪': fat,
            '每份蛋白質': protein,
            '每份膳食纖維': 0,
            '每 100g 熱量': qty > 0 ? Math.round(cal / qty * 100 * 10) / 10 : 0,
            '每 100g 碳水': qty > 0 ? Math.round(carb / qty * 100 * 10) / 10 : 0,
            '每 100g 脂肪': qty > 0 ? Math.round(fat / qty * 100 * 10) / 10 : 0,
            '每 100g 蛋白質': qty > 0 ? Math.round(protein / qty * 100 * 10) / 10 : 0,
            '每 100g 膳食纖維': 0,
          };
          // 以 1 份匯入
          state.groups[meal].push({ food, quantity: 1, mode: 'serving' });
        }
        importCount++;
      });

      state.activeGroup = state.groupOrder[0];
      Config.saveState();
      this.closeImport();
      this.renderTabs();
      this.renderGroupItems();
      this.renderTotal();
      toast(`已匯入 ${importCount} 筆飲食記錄`);
    },

    // ── Export ──
    openExport() {
      const text = Export.generate();
      if (!text.trim()) {
        toast('沒有可匯出的內容');
        return;
      }
      DOM.exportText.value = text;
      DOM.exportOverlay.classList.remove('hidden');
    },

    closeExport() {
      DOM.exportOverlay.classList.add('hidden');
    },

    async copyExport() {
      try {
        await navigator.clipboard.writeText(DOM.exportText.value);
        toast('已複製到剪貼簿');
      } catch (e) {
        DOM.exportText.select();
        document.execCommand('copy');
        toast('已複製');
      }
    },

    // ── Clear ──
    clearCurrent() {
      showConfirm('確定要清除所有群組的食材嗎？').then(ok => {
        if (!ok) return;
        state.groupOrder.forEach(g => state.groups[g] = []);
        Config.saveState();
        this.renderTabs();
        this.renderGroupItems();
        this.renderTotal();
        toast('已清除當前計算');
      });
    },

    clearAll() {
      showConfirm('確定要清除所有資料嗎？（含常用組合、最近使用紀錄、設定等）').then(ok => {
        if (!ok) return;
        Config.clearAll();
        state.groups = {};
        state.groupOrder = [...DEFAULT_GROUPS];
        DEFAULT_GROUPS.forEach(g => state.groups[g] = []);
        state.activeGroup = state.groupOrder[0];
        state.presets = [];
        state.recent = [];
        state.foods = [];
        state.useMock = false;

        this.renderTabs();
        this.renderGroupItems();
        this.renderTotal();
        this.renderRecent();
        DOM.setupNotice.classList.remove('hidden');
        toast('已清除所有資料');
      });
    },
  };

  // ── Utilities ─────────────────────────────────────
  function debounce(fn, ms) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), ms);
    };
  }

  function toast(msg) {
    DOM.toast.textContent = msg;
    DOM.toast.classList.remove('hidden');
    setTimeout(() => DOM.toast.classList.add('hidden'), 2000);
  }

  function showConfirm(message) {
    return new Promise(resolve => {
      const overlay = $('#confirm-overlay');
      const msgEl = $('#confirm-message');
      const btnOk = $('#btn-confirm-ok');
      const btnCancel = $('#btn-confirm-cancel');
      msgEl.textContent = message;
      overlay.classList.remove('hidden');

      function cleanup(result) {
        overlay.classList.add('hidden');
        btnOk.removeEventListener('click', onOk);
        btnCancel.removeEventListener('click', onCancel);
        resolve(result);
      }
      function onOk() { cleanup(true); }
      function onCancel() { cleanup(false); }

      btnOk.addEventListener('click', onOk);
      btnCancel.addEventListener('click', onCancel);
    });
  }

  function showPrompt(title, defaultValue) {
    return new Promise(resolve => {
      const overlay = $('#input-overlay');
      const titleEl = $('#input-modal-title');
      const inputEl = $('#input-modal-value');
      const btnOk = $('#btn-input-ok');
      const btnCancel = $('#btn-input-cancel');
      const btnClose = $('#btn-input-close');
      titleEl.textContent = title;
      inputEl.value = defaultValue || '';
      overlay.classList.remove('hidden');
      inputEl.focus();

      function cleanup(result) {
        overlay.classList.add('hidden');
        btnOk.removeEventListener('click', onOk);
        btnCancel.removeEventListener('click', onCancel);
        btnClose.removeEventListener('click', onCancel);
        inputEl.removeEventListener('keydown', onKey);
        resolve(result);
      }
      function onOk() { cleanup(inputEl.value); }
      function onCancel() { cleanup(null); }
      function onKey(e) { if (e.key === 'Enter') onOk(); }

      btnOk.addEventListener('click', onOk);
      btnCancel.addEventListener('click', onCancel);
      btnClose.addEventListener('click', onCancel);
      inputEl.addEventListener('keydown', onKey);
    });
  }

  // ── Init ──────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => UI.init());

  // Lucide icons: re-render after any dynamic content update
  const _origRenderTabs = UI.renderTabs.bind(UI);
  const _origRenderGroupItems = UI.renderGroupItems.bind(UI);
  const _origRenderRecent = UI.renderRecent.bind(UI);
  const _origRenderPresetsList = UI.renderPresetsList.bind(UI);
  UI.renderTabs = function (...args) { _origRenderTabs(...args); lucide.createIcons(); };
  UI.renderGroupItems = function (...args) { _origRenderGroupItems(...args); lucide.createIcons(); };
  UI.renderRecent = function (...args) { _origRenderRecent(...args); lucide.createIcons(); };
  UI.renderPresetsList = function (...args) { _origRenderPresetsList(...args); lucide.createIcons(); };

})();
