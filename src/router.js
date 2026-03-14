import { createRouter, createWebHashHistory } from 'vue-router'
import CalcView from './views/CalcView.vue'
import LoginView from './views/LoginView.vue'
import FoodsView from './views/FoodsView.vue'
import DietView from './views/DietView.vue'
import PresetsView from './views/PresetsView.vue'
import { isConfigured } from './store/index.js'

const routes = [
  { path: '/', component: CalcView },
  { path: '/calc', component: CalcView },
  { path: '/login', component: LoginView },
  { path: '/foods', component: FoodsView },
  { path: '/diet', component: DietView },
  { path: '/presets', component: PresetsView },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

router.beforeEach((to) => {
  if (to.path === '/' && isConfigured()) return '/diet'
  if ((to.path === '/foods' || to.path === '/diet') && !isConfigured()) return '/'
})

export default router
