import { afterEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import AppNotifications from '../AppNotifications.vue'
import { errorNotifications, notifyError } from '../../services/notifications'

describe('AppNotifications', () => {
  afterEach(() => {
    errorNotifications.value = []
  })

  it('exibe erros em destaque e permite dispensar a notificação', async () => {
    notifyError('O servidor recusou a operação.')
    const wrapper = mount(AppNotifications)

    expect(wrapper.get('[role="alert"]').text()).toContain('O servidor recusou a operação.')

    await wrapper.get('button[aria-label="Fechar notificação"]').trigger('click')

    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
  })
})
