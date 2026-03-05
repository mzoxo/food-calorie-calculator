import { createRouter, createWebHashHistory } from 'vue-router'
import CalcView from './views/CalcView.vue'
import LoginView from './views/LoginView.vue'
import FoodsView from './views/FoodsView.vue'
import { isConfigured } from './store/index.js'

const routes = [
  { path: '/', component: CalcView },
  { path: '/login', component: LoginView },
  { path: '/foods', component: FoodsView },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

router.beforeEach((to) => {
  if (to.path === '/foods' && !isConfigured()) return '/'
})

export default router
