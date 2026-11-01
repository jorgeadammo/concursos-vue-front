<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import AppNotifications from './components/AppNotifications.vue'
import { getAuthSession } from './services/auth'

const router = useRouter()
let sessionCheckInterval: number | undefined

function checkSessionExpiration() {
  if (router.currentRoute.value.meta.requiresAuth && !getAuthSession()) {
    void router.replace({ name: 'login' })
  }
}

onMounted(() => {
  checkSessionExpiration()
  sessionCheckInterval = window.setInterval(checkSessionExpiration, 1000)
  document.addEventListener('visibilitychange', checkSessionExpiration)
})

onBeforeUnmount(() => {
  if (sessionCheckInterval !== undefined) {
    window.clearInterval(sessionCheckInterval)
  }
  document.removeEventListener('visibilitychange', checkSessionExpiration)
})
</script>

<template>
  <RouterView />
  <AppNotifications />
</template>
