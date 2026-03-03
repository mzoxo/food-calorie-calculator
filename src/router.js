import { createRouter, createWebHashHistory } from 'vue-router'
import CalcView from './views/CalcView.vue'
import LoginView from './views/LoginView.vue'

const routes = [
  { path: '/', component: CalcView },
  { path: '/login', component: LoginView },
]

export default createRouter({
  history: createWebHashHistory(),
  routes,
})
