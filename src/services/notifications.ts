import { ref } from 'vue'

export interface AppNotification {
  id: number
  message: string
}

export const errorNotifications = ref<AppNotification[]>([])

let nextNotificationId = 0

export function notifyError(message: string): void {
  errorNotifications.value = [
    ...errorNotifications.value.slice(-2),
    {
    id: ++nextNotificationId,
    message,
    },
  ]
}

export function dismissError(id: number): void {
  errorNotifications.value = errorNotifications.value.filter(
    (notification) => notification.id !== id,
  )
}
