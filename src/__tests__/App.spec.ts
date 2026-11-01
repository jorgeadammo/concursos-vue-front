import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import App from '../App.vue'
import { getAuthSession, type AuthSession } from '../services/auth'

function createToken(expiresAt: number): string {
  const payload = btoa(JSON.stringify({ exp: expiresAt }))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
  return `header.${payload}.signature`
}

function saveSession(token: string): void {
  const session: AuthSession = {
    tokenType: 'Bearer',
    expiresIn: '2h',
    token,
    user: {
      id: 'user-1',
      name: 'Teste',
      email: 'teste@example.com',
      role: 'student',
      area: 'Geral',
    },
  }
  sessionStorage.setItem('aprova.auth-session', JSON.stringify(session))
}

describe('App', () => {
  afterEach(() => {
    vi.useRealTimers()
    sessionStorage.clear()
  })

  it('limpa a sessão e redireciona ao login quando o JWT expira', async () => {
    vi.useFakeTimers()
    const now = new Date('2026-11-01T12:00:00.000Z')
    vi.setSystemTime(now)
    saveSession(createToken(Math.floor(now.getTime() / 1000) + 2))

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', name: 'login', component: { template: '<div>Login</div>' } },
        {
          path: '/protected',
          name: 'protected',
          component: { template: '<div>Protegido</div>' },
          meta: { requiresAuth: true },
        },
      ],
    })
    await router.push('/protected')
    await router.isReady()
    const wrapper = mount(App, { global: { plugins: [router] } })

    await vi.advanceTimersByTimeAsync(2000)
    await flushPromises()

    expect(getAuthSession()).toBeNull()
    expect(router.currentRoute.value.name).toBe('login')
    wrapper.unmount()
  })
})
