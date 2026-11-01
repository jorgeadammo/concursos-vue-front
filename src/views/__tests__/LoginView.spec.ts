import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import LoginView from '../LoginView.vue'
import { getAuthSession, getAuthorizationHeader } from '../../services/auth'

const authResponse = {
  data: {
    tokenType: 'Bearer',
    expiresIn: '2h',
    token: 'test-token',
    user: {
      id: 'usr-admin',
      name: 'Camila Leite',
      email: 'camila@example.com',
      role: 'admin',
      area: 'Pharma Safe Checkout',
    },
  },
}

describe('LoginView', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    sessionStorage.clear()
  })

  it('envia email e senha para a API e exibe os dados da conta', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => authResponse,
    })
    vi.stubGlobal('fetch', fetchMock)
    const wrapper = mount(LoginView)

    await wrapper.get('input[name="email"]').setValue('camila@example.com')
    await wrapper.get('input[name="password"]').setValue('minha-senha')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3000/api/auth/login',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ email: 'camila@example.com', password: 'minha-senha' }),
      }),
    )
    expect(wrapper.get('#welcome-title').text()).toBe('Boas-vindas, Camila Leite!')
    expect(wrapper.get('.profile-details').text()).toContain('camila@example.com')
    expect(wrapper.get('.profile-details').text()).toContain('admin')
    expect(wrapper.get('.profile-details').text()).toContain('Pharma Safe Checkout')
    expect(getAuthSession()).toEqual(authResponse.data)
    expect(getAuthorizationHeader()).toBe('Bearer test-token')
  })

  it('exibe os dados da sessão existente e permite sair', async () => {
    sessionStorage.setItem('aprova.auth-session', JSON.stringify(authResponse.data))
    const wrapper = mount(LoginView)

    expect(wrapper.get('#welcome-title').text()).toBe('Boas-vindas, Camila Leite!')
    expect(wrapper.get('.profile-details').text()).toContain('camila@example.com')

    await wrapper.get('.welcome-logout').trigger('click')

    expect(getAuthSession()).toBeNull()
    expect(wrapper.get('#login-title').text()).toBe('Entre na sua conta')
  })

  it('exibe a mensagem retornada pela API quando o login falha', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ message: 'Credenciais inválidas.' }),
      }),
    )
    const wrapper = mount(LoginView)

    await wrapper.get('input[name="email"]').setValue('camila@example.com')
    await wrapper.get('input[name="password"]').setValue('senha-incorreta')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.get('[role="alert"]').text()).toBe('Credenciais inválidas.')
  })

  it('não autentica quando a resposta de sucesso não contém os dados da sessão', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: { token: 'test-token' } }),
      }),
    )
    const wrapper = mount(LoginView)

    await wrapper.get('input[name="email"]').setValue('camila@example.com')
    await wrapper.get('input[name="password"]').setValue('minha-senha')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.get('[role="alert"]').text()).toContain('resposta de autenticação está incompleta')
    expect(getAuthSession()).toBeNull()
  })
})
