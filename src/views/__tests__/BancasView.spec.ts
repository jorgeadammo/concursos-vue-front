import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import BancasView from '../BancasView.vue'

const banca = {
  id: 'bnc-123',
  name: 'Banca do Brazil',
  surname: 'BCB',
  phone: '61988888888',
  address: 'Brasília',
  active: false,
  createdAt: '2026-11-01T11:43:28.415Z',
  updatedAt: '2026-11-01T11:43:28.415Z',
}

const listResponse = (items: typeof banca[]) => ({
  data: items,
  meta: { total: items.length },
})

function setSession(role: string) {
  sessionStorage.setItem(
    'aprova.auth-session',
    JSON.stringify({
      tokenType: 'Bearer',
      expiresIn: '2h',
      token: 'test-token',
      user: { id: 'user-1', name: 'Teste', email: 'teste@example.com', role, area: 'Geral' },
    }),
  )
}

async function mountView(path = '/bancas') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'home', component: { template: '<div />' } },
      { path: '/bancas', name: 'bancas', component: BancasView },
      { path: '/bancas/:id', name: 'banca-detail', component: BancasView },
      { path: '/concursos', name: 'concursos', component: { template: '<div />' } },
    ],
  })
  await router.push(path)
  return mount(BancasView, { global: { plugins: [router] } })
}

describe('BancasView', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    sessionStorage.clear()
  })

  it('lista bancas e cadastra uma nova banca', async () => {
    setSession('admin')
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => listResponse([banca]) })
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: true, json: async () => listResponse([banca]) })
    vi.stubGlobal('fetch', fetchMock)
    const wrapper = await mountView()
    await flushPromises()

    expect(wrapper.text()).toContain('Banca do Brazil')
    expect(wrapper.text()).toContain('Inativa')
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'http://localhost:3000/api/bancas',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer test-token' }),
      }),
    )

    await wrapper.get('.page-heading button').trigger('click')
    await wrapper.get('#banca-name').setValue('Instituto de Testes')
    await wrapper.get('#banca-surname').setValue('IDT')
    await wrapper.get('#banca-phone').setValue('11999999999')
    await wrapper.get('#banca-address').setValue('São Paulo')
    await wrapper.get('.banca-form').trigger('submit')
    await flushPromises()

    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'http://localhost:3000/api/bancas',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          name: 'Instituto de Testes',
          surname: 'IDT',
          phone: '11999999999',
          address: 'São Paulo',
          active: true,
        }),
      }),
    )
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
  })

  it('edita e exclui uma banca', async () => {
    setSession('admin')
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => listResponse([banca]) })
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: true, json: async () => listResponse([banca]) })
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: true, json: async () => listResponse([]) })
    vi.stubGlobal('fetch', fetchMock)
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const wrapper = await mountView()
    await flushPromises()

    await wrapper.get('.row-actions button.action-button').trigger('click')
    await wrapper.get('#banca-name').setValue('Banca Atualizada')
    await wrapper.get('.banca-form').trigger('submit')
    await flushPromises()

    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'http://localhost:3000/api/bancas/bnc-123',
      expect.objectContaining({ method: 'PUT' }),
    )

    await wrapper.get('.delete-action').trigger('click')
    await flushPromises()

    expect(window.confirm).toHaveBeenCalledWith(
      'Tem certeza que deseja excluir a banca "Banca do Brazil"?',
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      4,
      'http://localhost:3000/api/bancas/bnc-123',
      expect.objectContaining({ method: 'DELETE' }),
    )
    expect(wrapper.text()).toContain('Nenhuma banca cadastrada')
  })

  it('permite a outros perfis listar e visualizar detalhes sem ações administrativas', async () => {
    setSession('editor')
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => listResponse([banca]) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: banca }) })
    vi.stubGlobal('fetch', fetchMock)
    const wrapper = await mountView()
    await flushPromises()

    expect(wrapper.text()).toContain('Banca do Brazil')
    expect(wrapper.get('.row-actions').text()).toContain('Visualizar')
    expect(wrapper.find('.row-actions button').exists()).toBe(false)
    expect(wrapper.find('.page-heading button').exists()).toBe(false)

    await wrapper.get('.row-actions a').trigger('click')
    await flushPromises()

    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'http://localhost:3000/api/bancas/bnc-123',
      expect.any(Object),
    )
    expect(wrapper.get('#detail-title').text()).toBe('Banca do Brazil')
    expect(wrapper.text()).toContain('61988888888')
    expect(wrapper.find('.detail-actions').exists()).toBe(false)
  })
})
