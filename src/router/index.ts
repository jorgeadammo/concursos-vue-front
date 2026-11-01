import { createRouter, createWebHistory } from 'vue-router'
import { getAuthSession } from '../services/auth'
import LoginView from '../views/LoginView.vue'
import BancasView from '../views/BancasView.vue'
import ConcursosView from '../views/ConcursosView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'login',
      component: LoginView,
    },
    {
      path: '/bancas',
      name: 'bancas',
      component: BancasView,
      meta: { requiresAuth: true },
    },
    {
      path: '/bancas/:id',
      name: 'banca-detail',
      component: BancasView,
      meta: { requiresAuth: true },
    },
    {
      path: '/concursos',
      name: 'concursos',
      component: ConcursosView,
      meta: { requiresAuth: true },
    },
    {
      path: '/concursos/:id',
      name: 'concurso-detail',
      component: ConcursosView,
      meta: { requiresAuth: true },
    },
  ],
})

router.beforeEach((to) => {
  if (to.meta.requiresAuth && !getAuthSession()) {
    return { name: 'login' }
  }
})

export default router
