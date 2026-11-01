import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import ConcursosView from '../ConcursosView.vue'

const banca = {
  id: 'bnc-123',
  name: 'Banca do Brazil',
  surname: 'BCB',
  phone: '61988888888',
  address: 'Brasília',
  active: true,
  createdAt: '2026-11-01T11:43:28.415Z',
  updatedAt: '2026-11-01T11:43:28.415Z',
}

const inactiveBanca = {
  ...banca,
  id: 'bnc-inactive',
  name: 'Banca Inativa',
  active: false,
}

const concurso = {
  id: 'cnc-123',
  title: 'Concurso para analista',
  year: 2026,
  entity: 'municipal',
  uf: 'DF',
  administration: 'Secretaria de Administração',
  initialRegistrationDate: '2026-10-24T19:46:48.610Z',
  finalRegistrationDate: '2026-11-24T19:46:48.610Z',
  format: 'prova objetiva',
  regime: 'estatutário',
  link: 'https://example.com/concurso',
  knowledges: ['CONHECIMENTOS GERAIS', 'CONHECIMENTOS ESPECÍFICOS'],
  publicNotice: 'edital-01-2026.pdf',
  publicNoticeDate: '2026-10-24T19:46:48.610Z',
  active: true,
  bancaId: banca.id,
  banca,
  createdByEmail: 'camila.qa@example.com',
  editedByEmail: 'admin@example.com',
  createdAt: '2026-11-01T11:47:02.930Z',
  updatedAt: '2026-11-01T12:15:02.930Z',
}

const listResponse = (items: typeof concurso[]) => ({
  data: items,
  meta: { total: items.length },
})

const followedResponse = (items: typeof concurso[]) => ({
  data: items.map((item, index) => ({
    id: `flw-${index + 1}`,
    userId: 'user-1',
    concursoId: item.id,
    createdAt: '2026-11-01T12:00:00.000Z',
    concurso: item,
  })),
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

async function mountView(path = '/concursos') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'home', component: { template: '<div />' } },
      { path: '/concursos', name: 'concursos', component: ConcursosView },
      { path: '/concursos/:id', name: 'concurso-detail', component: ConcursosView },
      { path: '/bancas', name: 'bancas', component: { template: '<div />' } },
    ],
  })
  await router.push(path)
  return mount(ConcursosView, { global: { plugins: [router] } })
}

describe('ConcursosView', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    sessionStorage.clear()
  })

  it('lista concursos e cria um concurso com conhecimentos e banca', async () => {
    setSession('admin')
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => listResponse([concurso]) })
      .mockResolvedValueOnce({ ok: true, json: async () => followedResponse([]) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [banca, inactiveBanca], meta: { total: 2 } }),
      })
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: true, json: async () => listResponse([concurso]) })
      .mockResolvedValueOnce({ ok: true, json: async () => followedResponse([]) })
    vi.stubGlobal('fetch', fetchMock)
    const wrapper = await mountView()
    await flushPromises()

    expect(wrapper.text()).toContain('Concurso para analista')
    expect(wrapper.text()).toContain('Banca do Brazil')
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'http://localhost:3000/api/concursos/followed',
      expect.any(Object),
    )

    await wrapper.get('.page-heading button').trigger('click')
    await flushPromises()
    const bancaSelect = wrapper.get<HTMLSelectElement>('#concurso-banca')
    expect(Array.from(bancaSelect.element.options).map((option) => option.textContent?.trim())).toEqual([
      'Selecione uma banca',
      'Banca do Brazil (BCB)',
    ])
    const entitySelect = wrapper.get<HTMLSelectElement>('#concurso-entity')
    expect(Array.from(entitySelect.element.options).map((option) => option.value)).toEqual([
      '',
      'municipal',
      'estadual',
      'federal',
    ])
    const regimeSelect = wrapper.get<HTMLSelectElement>('#concurso-regime')
    expect(Array.from(regimeSelect.element.options).map((option) => option.value)).toEqual([
      '',
      'estatutário',
      'celetista',
    ])
    const ufSelect = wrapper.get<HTMLSelectElement>('#concurso-uf')
    expect(Array.from(ufSelect.element.options).map((option) => option.value)).toEqual([
      '',
      'AC',
      'AL',
      'AP',
      'AM',
      'BA',
      'CE',
      'DF',
      'ES',
      'GO',
      'MA',
      'MT',
      'MS',
      'MG',
      'PA',
      'PB',
      'PR',
      'PE',
      'PI',
      'RJ',
      'RN',
      'RS',
      'RO',
      'RR',
      'SC',
      'SP',
      'SE',
      'TO',
    ])
    await wrapper.get('#concurso-title').setValue('Analista de sistemas')
    await wrapper.get('#concurso-year').setValue('2027')
    await wrapper.get('#concurso-entity').setValue('municipal')
    await wrapper.get('#concurso-uf').setValue('DF')
    await wrapper.get('#concurso-administration').setValue('Secretaria Municipal')
    await wrapper.get('#concurso-initial-date').setValue('2027-01-10T09:00')
    await wrapper.get('#concurso-final-date').setValue('2027-02-10T18:00')
    await wrapper.get('#concurso-format').setValue('prova objetiva')
    await wrapper.get('#concurso-regime').setValue('estatutário')
    await wrapper.get('#concurso-link').setValue('https://example.com')
    await wrapper.get('#concurso-banca').setValue(banca.id)
    await wrapper.get('#concurso-knowledges').setValue('Português\nMatemática')
    await wrapper.get('#concurso-notice').setValue('edital.pdf')
    await wrapper.get('#concurso-notice-date').setValue('2026-12-01T12:00')
    await wrapper.get('.concurso-form').trigger('submit')
    await flushPromises()

    expect(fetchMock).toHaveBeenNthCalledWith(
      4,
      'http://localhost:3000/api/concursos',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"knowledges":["Português","Matemática"]'),
      }),
    )
    expect(JSON.parse(fetchMock.mock.calls[3]![1]!.body as string)).toMatchObject({
      title: 'Analista de sistemas',
      year: 2027,
      uf: 'DF',
      bancaId: banca.id,
      publicNotice: 'edital.pdf',
    })
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
  })

  it('permite a outros perfis listar e visualizar detalhes sem ações administrativas', async () => {
    setSession('editor')
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => listResponse([concurso]) })
      .mockResolvedValueOnce({ ok: true, json: async () => followedResponse([]) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: concurso }) })
    vi.stubGlobal('fetch', fetchMock)
    const wrapper = await mountView()
    await flushPromises()

    expect(wrapper.text()).toContain('Concurso para analista')
    expect(wrapper.get('.row-actions').text()).toContain('Visualizar')
    expect(wrapper.get('.row-actions').text()).toContain('Seguir')
    expect(wrapper.get('.row-actions').text()).not.toContain('Editar')
    expect(wrapper.get('.row-actions').text()).not.toContain('Excluir')
    expect(wrapper.get('.row-actions').text()).not.toContain('Auditoria')
    expect(wrapper.find('.page-heading button').exists()).toBe(false)

    await wrapper.get('.row-actions a').trigger('click')
    await flushPromises()

    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      'http://localhost:3000/api/concursos/cnc-123',
      expect.any(Object),
    )
    expect(wrapper.get('#detail-title').text()).toBe('Concurso para analista')
    expect(wrapper.text()).toContain('CONHECIMENTOS ESPECÍFICOS')
    expect(wrapper.find('.admin-actions').exists()).toBe(false)
  })

  it('exibe auditoria do concurso somente para administradores', async () => {
    setSession('admin')
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => listResponse([concurso]) })
      .mockResolvedValueOnce({ ok: true, json: async () => followedResponse([]) })
    vi.stubGlobal('fetch', fetchMock)
    const wrapper = await mountView()
    await flushPromises()

    await wrapper.get('.row-actions').get('button:nth-of-type(2)').trigger('click')

    const auditDialog = wrapper.get('[role="dialog"]')
    expect(auditDialog.text()).toContain('Auditoria')
    expect(auditDialog.text()).toContain('camila.qa@example.com')
    expect(auditDialog.text()).toContain('admin@example.com')
    expect(auditDialog.text()).toContain('01/11/2026')
    expect(auditDialog.text()).toMatch(/\d{2}:\d{2}/)
  })

  it('permite seguir e deixar de seguir um concurso usando a API', async () => {
    setSession('student')
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => listResponse([concurso]),
      })
      .mockResolvedValueOnce({ ok: true, json: async () => followedResponse([]) })
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => listResponse([concurso]),
      })
      .mockResolvedValueOnce({ ok: true, json: async () => followedResponse([concurso]) })
      .mockResolvedValueOnce({ ok: true })
    vi.stubGlobal('fetch', fetchMock)
    const wrapper = await mountView()
    await flushPromises()

    const followButton = wrapper.get('.follow-action')
    expect(followButton.text()).toBe('Seguir')
    expect(wrapper.text()).toContain('Você ainda não está seguindo nenhum concurso.')

    await followButton.trigger('click')
    await flushPromises()

    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      'http://localhost:3000/api/concursos/cnc-123/follow',
      expect.objectContaining({ method: 'POST' }),
    )
    expect(wrapper.get('.follow-action').text()).toBe('Deixar de seguir')
    expect(wrapper.get('.followed-section').text()).toContain('Concurso para analista')

    wrapper.unmount()
    const reloadedWrapper = await mountView()
    await flushPromises()
    expect(reloadedWrapper.get('.follow-action').text()).toBe('Deixar de seguir')

    await reloadedWrapper.get('.follow-action').trigger('click')
    await flushPromises()

    expect(fetchMock).toHaveBeenNthCalledWith(
      6,
      'http://localhost:3000/api/concursos/cnc-123/follow',
      expect.objectContaining({ method: 'DELETE' }),
    )
    expect(reloadedWrapper.get('.follow-action').text()).toBe('Seguir')
    expect(reloadedWrapper.get('.followed-section').text()).toContain(
      'Você ainda não está seguindo nenhum concurso.',
    )
  })

  it('edita e exclui um concurso para administrador', async () => {
    setSession('admin')
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: concurso }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: [banca], meta: { total: 1 } }) })
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: concurso }) })
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: true, json: async () => listResponse([]) })
      .mockResolvedValueOnce({ ok: true, json: async () => followedResponse([]) })
    vi.stubGlobal('fetch', fetchMock)
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const wrapper = await mountView('/concursos/cnc-123')
    await flushPromises()

    await wrapper.get('.admin-actions button:nth-of-type(2)').trigger('click')
    await flushPromises()
    await wrapper.get('#concurso-title').setValue('Concurso atualizado')
    await wrapper.get('.concurso-form').trigger('submit')
    await flushPromises()

    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      'http://localhost:3000/api/concursos/cnc-123',
      expect.objectContaining({ method: 'PUT' }),
    )
    expect(JSON.parse(fetchMock.mock.calls[2]![1]!.body as string)).toMatchObject({
      title: 'Concurso atualizado',
      bancaId: banca.id,
      knowledges: concurso.knowledges,
    })

    await wrapper.get('.detail-actions .delete-button').trigger('click')
    await flushPromises()

    expect(window.confirm).toHaveBeenCalledWith(
      'Tem certeza que deseja excluir o concurso "Concurso para analista"?',
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      5,
      'http://localhost:3000/api/concursos/cnc-123',
      expect.objectContaining({ method: 'DELETE' }),
    )
    expect(wrapper.text()).toContain('Nenhum concurso cadastrado')
  })
})
