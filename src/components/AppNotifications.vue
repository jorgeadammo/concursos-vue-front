<script setup lang="ts">
import { dismissError, errorNotifications } from '../services/notifications'
</script>

<template>
  <div class="notification-stack" aria-label="Notificações">
    <div
      v-for="notification in errorNotifications"
      :key="notification.id"
      class="error-notification"
      role="alert"
    >
      <span class="error-icon" aria-hidden="true">!</span>
      <p>{{ notification.message }}</p>
      <button
        type="button"
        aria-label="Fechar notificação"
        @click="dismissError(notification.id)"
      >
        ×
      </button>
    </div>
  </div>
</template>

<style scoped>
.notification-stack {
  position: fixed;
  z-index: 20;
  top: 18px;
  right: 20px;
  display: flex;
  width: min(440px, calc(100vw - 32px));
  flex-direction: column;
  gap: 10px;
  pointer-events: none;
}

.error-notification {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  border: 1px solid #f0c2be;
  border-left: 5px solid #c7473e;
  border-radius: 10px;
  color: #752c27;
  background: #fff7f6;
  box-shadow: 0 10px 28px rgb(65 25 22 / 18%);
  pointer-events: auto;
  animation: notification-enter 180ms ease-out;
}

.error-icon {
  display: grid;
  width: 23px;
  height: 23px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 50%;
  color: #fff;
  background: #c7473e;
  font-size: 14px;
  font-weight: 750;
}

.error-notification p {
  flex: 1;
  padding-top: 1px;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.5;
}

.error-notification button {
  width: 26px;
  height: 26px;
  flex: 0 0 auto;
  border: 0;
  border-radius: 6px;
  color: #8d3933;
  background: transparent;
  cursor: pointer;
  font: inherit;
  font-size: 21px;
  line-height: 1;
}

.error-notification button:hover {
  background: #f9e4e1;
}

.error-notification button:focus-visible {
  outline: 2px solid #a93c35;
  outline-offset: 2px;
}

@keyframes notification-enter {
  from {
    transform: translateY(-8px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

@media (max-width: 520px) {
  .notification-stack {
    top: 10px;
    right: 10px;
    width: calc(100vw - 20px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .error-notification {
    animation: none;
  }
}
</style>
