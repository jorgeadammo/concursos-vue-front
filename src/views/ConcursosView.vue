<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getAuthSession, logout } from '../services/auth'
import { notifyError } from '../services/notifications'
import { listBancas, type Banca } from '../services/bancas'
import {
  createConcurso,
  deleteConcurso,
  followConcurso,
  getConcurso,
  listFollowedConcursos,
  listConcursos,
  unfollowConcurso,
  updateConcurso,
  type Concurso,
  type ConcursoInput,
} from '../services/concursos'

const route = useRoute()
const router = useRouter()
const concursos = ref<Concurso[]>([])
const followedConcursos = ref<Concurso[]>([])
const bancas = ref<Banca[]>([])
const selectedConcurso = ref<Concurso | null>(null)
const auditConcurso = ref<Concurso | null>(null)
const total = ref(0)
const search = ref('')
const isLoading = ref(true)
const isLoadingFollowed = ref(true)
const isSaving = ref(false)
const followingConcursoId = ref<string | null>(null)
const errorMessage = ref('')
const followedErrorMessage = ref('')
const formError = ref('')
const isFormOpen = ref(false)
const editingConcursoId = ref<string | null>(null)
const concursoId = computed(() => (typeof route.params.id === 'string' ? route.params.id : null))
const isAdmin = computed(() => getAuthSession()?.user.role.toLowerCase() === 'admin')
const brazilianStates = [
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
]

interface ConcursoForm {
  title: string
  year: number
  entity: string
  uf: string
  administration: string
  initialRegistrationDate: string
  finalRegistrationDate: string
  format: string
  regime: string
  link: string
  knowledgesText: string
  publicNotice: string
  publicNoticeDate: string
  active: boolean
  bancaId: string
}

const emptyForm = (): ConcursoForm => ({
  title: '',
  year: new Date().getFullYear(),
  entity: '',
  uf: '',
  administration: '',
  initialRegistrationDate: '',
  finalRegistrationDate: '',
  format: '',
  regime: '',
  link: '',
  knowledgesText: '',
  publicNotice: '',
  publicNoticeDate: '',
  active: true,
  bancaId: '',
})

const form = reactive<ConcursoForm>(emptyForm())

const filteredConcursos = computed(() => {
  const query = search.value.trim().toLocaleLowerCase('pt-BR')
  if (!query) return concursos.value

  return concursos.value.filter((concurso) =>
    [
      concurso.title,
      concurso.year,
      concurso.entity,
      concurso.uf,
      concurso.administration,
      concurso.format,
      concurso.regime,
      concurso.banca?.name,
    ]
      .join(' ')
      .toLocaleLowerCase('pt-BR')
      .includes(query),
  )
})

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof TypeError) {
    return 'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.'
  }
  return error instanceof Error ? error.message : fallback
}

async function loadConcursos() {
  errorMessage.value = ''
  isLoading.value = true
  const concursosRequest = listConcursos()
  void loadFollowedConcursos()

  try {
    const result = await concursosRequest
    concursos.value = result.items
    total.value = result.total
    if (!isLoadingFollowed.value) {
      const followedIds = new Set(followedConcursos.value.map((concurso) => concurso.id))
      concursos.value = concursos.value.map((concurso) => ({
        ...concurso,
        isFollowing: followedIds.has(concurso.id),
      }))
    }
  } catch (error) {
    errorMessage.value = getErrorMessage(error, 'Ocorreu um erro inesperado ao carregar os concursos.')
    notifyError(errorMessage.value)
  } finally {
    isLoading.value = false
  }
}

async function loadFollowedConcursos() {
  isLoadingFollowed.value = true
  followedErrorMessage.value = ''

  try {
    const result = await listFollowedConcursos()
    followedConcursos.value = result.items.map(({ concurso }) => ({
      ...concurso,
      isFollowing: true,
    }))

    const followedIds = new Set(followedConcursos.value.map((concurso) => concurso.id))
    concursos.value = concursos.value.map((concurso) => ({
      ...concurso,
      isFollowing: followedIds.has(concurso.id),
    }))
  } catch (error) {
    followedErrorMessage.value = getErrorMessage(
      error,
      'Ocorreu um erro ao carregar os concursos que você segue.',
    )
    notifyError(followedErrorMessage.value)
  } finally {
    isLoadingFollowed.value = false
  }
}

async function loadConcurso(id: string) {
  errorMessage.value = ''
  isLoading.value = true
  selectedConcurso.value = null

  try {
    selectedConcurso.value = await getConcurso(id)
  } catch (error) {
    errorMessage.value = getErrorMessage(error, 'Ocorreu um erro inesperado ao carregar o concurso.')
    notifyError(errorMessage.value)
  } finally {
    isLoading.value = false
  }
}

async function loadBancasForForm() {
  try {
    bancas.value = (await listBancas()).items.filter((banca) => banca.active)
  } catch (error) {
    formError.value = getErrorMessage(error, 'Ocorreu um erro ao carregar as bancas.')
    notifyError(formError.value)
  }
}

function toLocalDateTime(value: string): string {
  const date = new Date(value)
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

function openCreateForm() {
  if (!isAdmin.value) return
  editingConcursoId.value = null
  Object.assign(form, emptyForm())
  formError.value = ''
  isFormOpen.value = true
  void loadBancasForForm()
}

function openEditForm(concurso: Concurso) {
  if (!isAdmin.value) return
  editingConcursoId.value = concurso.id
  Object.assign(form, {
    title: concurso.title,
    year: concurso.year,
    entity: concurso.entity,
    uf: concurso.uf,
    administration: concurso.administration,
    initialRegistrationDate: toLocalDateTime(concurso.initialRegistrationDate),
    finalRegistrationDate: toLocalDateTime(concurso.finalRegistrationDate),
    format: concurso.format,
    regime: concurso.regime,
    link: concurso.link,
    knowledgesText: concurso.knowledges.join('\n'),
    publicNotice: concurso.publicNotice ?? '',
    publicNoticeDate: toLocalDateTime(concurso.publicNoticeDate),
    active: concurso.active,
    bancaId: concurso.bancaId,
  })
  formError.value = ''
  isFormOpen.value = true
  void loadBancasForForm()
}

function closeForm() {
  isFormOpen.value = false
  formError.value = ''
}

async function saveConcurso() {
  if (!isAdmin.value) return
  formError.value = ''
  isSaving.value = true

  const input: ConcursoInput = {
    title: form.title.trim(),
    year: Number(form.year),
    entity: form.entity.trim(),
    uf: form.uf.trim().toUpperCase(),
    administration: form.administration.trim(),
    initialRegistrationDate: new Date(form.initialRegistrationDate).toISOString(),
    finalRegistrationDate: new Date(form.finalRegistrationDate).toISOString(),
    format: form.format.trim(),
    regime: form.regime.trim(),
    link: form.link.trim(),
    knowledges: form.knowledgesText
      .split('\n')
      .map((knowledge) => knowledge.trim())
      .filter(Boolean),
    publicNotice: form.publicNotice.trim() || null,
    publicNoticeDate: new Date(form.publicNoticeDate).toISOString(),
    active: form.active,
    bancaId: form.bancaId,
  }

  try {
    if (editingConcursoId.value) {
      await updateConcurso(editingConcursoId.value, input)
    } else {
      await createConcurso(input)
    }

    closeForm()
    if (concursoId.value) {
      await loadConcurso(concursoId.value)
    } else {
      await loadConcursos()
    }
  } catch (error) {
    formError.value = getErrorMessage(error, 'Ocorreu um erro inesperado ao salvar o concurso.')
    notifyError(formError.value)
  } finally {
    isSaving.value = false
  }
}

async function removeConcurso(concurso: Concurso) {
  if (!isAdmin.value) return
  if (!window.confirm(`Tem certeza que deseja excluir o concurso "${concurso.title}"?`)) return

  errorMessage.value = ''
  try {
    await deleteConcurso(concurso.id)
    if (concursoId.value === concurso.id) {
      void router.push({ name: 'concursos' })
    } else {
      await loadConcursos()
    }
  } catch (error) {
    errorMessage.value = getErrorMessage(error, 'Ocorreu um erro inesperado ao excluir o concurso.')
    notifyError(errorMessage.value)
  }
}

async function toggleFollow(concurso: Concurso) {
  if (followingConcursoId.value) return

  followingConcursoId.value = concurso.id
  errorMessage.value = ''

  try {
    const isFollowing = !concurso.isFollowing
    if (!isFollowing) {
      await unfollowConcurso(concurso.id)
    } else {
      await followConcurso(concurso.id)
    }

    concurso.isFollowing = isFollowing
    concursos.value = concursos.value.map((item) =>
      item.id === concurso.id ? { ...item, isFollowing } : item,
    )
    followedConcursos.value = isFollowing
      ? [
          { ...concurso, isFollowing: true },
          ...followedConcursos.value.filter((item) => item.id !== concurso.id),
        ]
      : followedConcursos.value.filter((item) => item.id !== concurso.id)
    if (selectedConcurso.value?.id === concurso.id) {
      selectedConcurso.value.isFollowing = isFollowing
    }
  } catch (error) {
    errorMessage.value = getErrorMessage(error, 'Ocorreu um erro ao atualizar o acompanhamento.')
    notifyError(errorMessage.value)
  } finally {
    followingConcursoId.value = null
  }
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('pt-BR').format(new Date(value))
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(
    new Date(value),
  )
}

function openAudit(concurso: Concurso) {
  if (!isAdmin.value) return
  auditConcurso.value = concurso
}

function closeAudit() {
  auditConcurso.value = null
}

function signOut() {
  logout()
  void router.push({ name: 'login' })
}

watch(
  concursoId,
  (id) => {
    if (id) {
      void loadConcurso(id)
    } else {
      void loadConcursos()
    }
  },
  { immediate: true },
)
</script>

<template>
  <main class="concursos-page">
    <header class="topbar">
      <RouterLink class="brand" to="/" aria-label="Aprova, página inicial">
        <span class="brand-mark" aria-hidden="true">✓</span>
        <span>aprova<span class="brand-period">.</span></span>
      </RouterLink>
      <nav class="main-nav" aria-label="Navegação principal">
        <RouterLink :to="{ name: 'concursos' }" active-class="is-current">Concursos</RouterLink>
        <RouterLink :to="{ name: 'bancas' }" active-class="is-current">Bancas</RouterLink>
      </nav>
      <button class="text-button" type="button" @click="signOut">Sair da conta</button>
    </header>

    <section v-if="concursoId" class="content" aria-labelledby="detail-title">
      <RouterLink class="back-link" :to="{ name: 'concursos' }">← Voltar para concursos</RouterLink>
      <p v-if="errorMessage" class="alert-message" role="alert">{{ errorMessage }}</p>
      <div v-if="isLoading" class="empty-state" role="status">Carregando concurso...</div>
      <div v-else-if="selectedConcurso" class="detail-card">
        <div class="detail-heading">
          <div>
            <span class="eyebrow">DETALHES DO CONCURSO</span>
            <h1 id="detail-title">{{ selectedConcurso.title }}</h1>
            <p>{{ selectedConcurso.entity }} · {{ selectedConcurso.uf }} · {{ selectedConcurso.year }}</p>
          </div>
          <span class="status-badge" :class="selectedConcurso.active ? 'is-active' : 'is-inactive'">
            {{ selectedConcurso.active ? 'Ativo' : 'Inativo' }}
          </span>
        </div>

        <dl class="detail-fields">
          <div><dt>Órgão</dt><dd>{{ selectedConcurso.administration }}</dd></div>
          <div><dt>Banca</dt><dd>{{ selectedConcurso.banca?.name ?? '—' }}</dd></div>
          <div>
            <dt>Inscrições</dt>
            <dd>
              {{ formatDate(selectedConcurso.initialRegistrationDate) }} –
              {{ formatDate(selectedConcurso.finalRegistrationDate) }}
            </dd>
          </div>
          <div><dt>Formato</dt><dd>{{ selectedConcurso.format }}</dd></div>
          <div><dt>Regime</dt><dd>{{ selectedConcurso.regime }}</dd></div>
          <div>
            <dt>Link</dt>
            <dd>
              <a v-if="selectedConcurso.link" :href="selectedConcurso.link" target="_blank" rel="noreferrer">
                Acessar página do concurso
              </a>
              <span v-else>—</span>
            </dd>
          </div>
          <div>
            <dt>Edital</dt>
            <dd>{{ selectedConcurso.publicNotice || '—' }}</dd>
          </div>
          <div><dt>Data do edital</dt><dd>{{ formatDate(selectedConcurso.publicNoticeDate) }}</dd></div>
          <div>
            <dt>Conhecimentos</dt>
            <dd>
              <ul class="knowledge-list">
                <li v-for="knowledge in selectedConcurso.knowledges" :key="knowledge">
                  {{ knowledge }}
                </li>
                <li v-if="selectedConcurso.knowledges.length === 0">—</li>
              </ul>
            </dd>
          </div>
          <div><dt>Criado em</dt><dd>{{ formatDateTime(selectedConcurso.createdAt) }}</dd></div>
        </dl>

        <div class="follow-controls">
          <button
            class="follow-button"
            type="button"
            :disabled="followingConcursoId === selectedConcurso.id"
            @click="toggleFollow(selectedConcurso)"
          >
            {{
              followingConcursoId === selectedConcurso.id
                ? 'Atualizando...'
                : selectedConcurso.isFollowing
                  ? 'Deixar de seguir'
                  : 'Seguir concurso'
            }}
          </button>
        </div>

        <div v-if="isAdmin" class="detail-actions admin-actions">
          <button class="secondary-button" type="button" @click="openAudit(selectedConcurso)">
            Auditoria
          </button>
          <button class="secondary-button" type="button" @click="openEditForm(selectedConcurso)">
            Editar concurso
          </button>
          <button
            class="secondary-button delete-button"
            type="button"
            @click="removeConcurso(selectedConcurso)"
          >
            Excluir concurso
          </button>
        </div>
      </div>
    </section>

    <section v-else class="content" aria-labelledby="page-title">
      <div class="page-heading">
        <div>
          <span class="eyebrow">CONSULTA E GESTÃO</span>
          <h1 id="page-title">Concursos</h1>
          <p>Consulte concursos e acompanhe prazos de inscrição.</p>
        </div>
        <button v-if="isAdmin" class="primary-button" type="button" @click="openCreateForm">
          <span aria-hidden="true">+</span>
          Novo concurso
        </button>
      </div>

      <div class="list-toolbar">
        <label class="search-field">
          <span class="sr-only">Buscar concursos</span>
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="10.8" cy="10.8" r="6.8" />
            <path d="m16 16 4.5 4.5" />
          </svg>
          <input
            v-model="search"
            type="search"
            placeholder="Buscar por título, órgão, UF ou banca"
          />
        </label>
        <span class="total-count">
          {{ total }} {{ total === 1 ? 'concurso cadastrado' : 'concursos cadastrados' }}
        </span>
      </div>

      <section class="followed-section" aria-labelledby="followed-title">
        <div class="followed-heading">
          <div>
            <span class="eyebrow">ACOMPANHAMENTO</span>
            <h2 id="followed-title">Concursos que estou seguindo</h2>
          </div>
          <span class="followed-count">
            {{ followedConcursos.length }}
            {{ followedConcursos.length === 1 ? 'concurso' : 'concursos' }}
          </span>
        </div>

        <p v-if="isLoadingFollowed" class="followed-empty" role="status">
          Carregando seus concursos...
        </p>
        <p v-else-if="followedErrorMessage" class="followed-error" role="alert">
          {{ followedErrorMessage }}
        </p>
        <p v-else-if="followedConcursos.length === 0" class="followed-empty">
          Você ainda não está seguindo nenhum concurso.
        </p>
        <ul v-else class="followed-list">
          <li v-for="concurso in followedConcursos" :key="concurso.id" class="followed-item">
            <RouterLink
              class="followed-link"
              :to="{ name: 'concurso-detail', params: { id: concurso.id } }"
            >
              <span class="followed-item-title">{{ concurso.title }}</span>
              <span class="followed-item-meta">
                {{ concurso.administration }} · {{ concurso.uf }} · Inscrições até
                {{ formatDate(concurso.finalRegistrationDate) }}
              </span>
            </RouterLink>
            <button
              class="action-button follow-action"
              type="button"
              :disabled="followingConcursoId === concurso.id"
              @click="toggleFollow(concurso)"
            >
              {{ followingConcursoId === concurso.id ? 'Atualizando...' : 'Deixar de seguir' }}
            </button>
          </li>
        </ul>
      </section>

      <p v-if="errorMessage" class="alert-message" role="alert">{{ errorMessage }}</p>

      <div class="table-card">
        <div v-if="isLoading" class="empty-state" role="status">Carregando concursos...</div>
        <div v-else-if="filteredConcursos.length === 0" class="empty-state">
          <strong>{{ search ? 'Nenhum concurso encontrado' : 'Nenhum concurso cadastrado' }}</strong>
          <span>{{ search ? 'Tente outra busca.' : 'Ainda não há concursos para exibir.' }}</span>
          <button v-if="!search && isAdmin" class="secondary-button" type="button" @click="openCreateForm">
            Cadastrar concurso
          </button>
        </div>
        <div v-else class="table-scroll">
          <table>
            <thead>
              <tr>
                <th scope="col">Concurso</th>
                <th scope="col">Órgão / UF</th>
                <th scope="col">Banca</th>
                <th scope="col">Inscrições até</th>
                <th scope="col">Status</th>
                <th scope="col">Ações</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="concurso in filteredConcursos" :key="concurso.id">
                <td>
                  <strong class="item-name">{{ concurso.title }}</strong>
                  <span class="item-subtitle">{{ concurso.year }} · {{ concurso.entity }}</span>
                </td>
                <td>{{ concurso.administration }} / {{ concurso.uf }}</td>
                <td>{{ concurso.banca?.name ?? '—' }}</td>
                <td>{{ formatDate(concurso.finalRegistrationDate) }}</td>
                <td>
                  <span class="status-badge" :class="concurso.active ? 'is-active' : 'is-inactive'">
                    {{ concurso.active ? 'Ativo' : 'Inativo' }}
                  </span>
                </td>
                <td>
                  <div class="row-actions">
                    <RouterLink
                      class="action-button"
                      :to="{ name: 'concurso-detail', params: { id: concurso.id } }"
                    >
                      Visualizar
                    </RouterLink>
                    <button
                      class="action-button follow-action"
                      type="button"
                      :disabled="followingConcursoId === concurso.id"
                      @click="toggleFollow(concurso)"
                    >
                      {{
                        followingConcursoId === concurso.id
                          ? '...'
                          : concurso.isFollowing
                            ? 'Deixar de seguir'
                            : 'Seguir'
                      }}
                    </button>
                    <template v-if="isAdmin">
                      <button class="action-button" type="button" @click="openAudit(concurso)">
                        Auditoria
                      </button>
                      <button class="action-button" type="button" @click="openEditForm(concurso)">
                        Editar
                      </button>
                      <button
                        class="action-button delete-action"
                        type="button"
                        @click="removeConcurso(concurso)"
                      >
                        Excluir
                      </button>
                    </template>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <div v-if="isFormOpen" class="modal-backdrop" @click.self="closeForm">
      <section
        class="concurso-dialog"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="editingConcursoId ? 'edit-concurso-title' : 'new-concurso-title'"
      >
        <div class="dialog-heading">
          <div>
            <span class="eyebrow">{{ editingConcursoId ? 'ATUALIZAÇÃO' : 'CADASTRO' }}</span>
            <h2 :id="editingConcursoId ? 'edit-concurso-title' : 'new-concurso-title'">
              {{ editingConcursoId ? 'Editar concurso' : 'Novo concurso' }}
            </h2>
          </div>
          <button class="close-button" type="button" aria-label="Fechar" @click="closeForm">×</button>
        </div>

        <form class="concurso-form" @submit.prevent="saveConcurso">
          <label for="concurso-title">Título</label>
          <input id="concurso-title" v-model="form.title" required maxlength="180" />

          <div class="form-grid">
            <div>
              <label for="concurso-year">Ano</label>
              <input id="concurso-year" v-model.number="form.year" type="number" min="1900" max="2200" required />
            </div>
            <div>
              <label for="concurso-entity">Esfera</label>
              <select id="concurso-entity" v-model="form.entity" required>
                <option disabled value="">Selecione a esfera</option>
                <option value="municipal">Municipal</option>
                <option value="estadual">Estadual</option>
                <option value="federal">Federal</option>
              </select>
            </div>
            <div>
              <label for="concurso-uf">UF</label>
              <select id="concurso-uf" v-model="form.uf" required>
                <option disabled value="">Selecione a UF</option>
                <option v-for="uf in brazilianStates" :key="uf" :value="uf">{{ uf }}</option>
              </select>
            </div>
            <div>
              <label for="concurso-administration">Órgão</label>
              <input id="concurso-administration" v-model="form.administration" required maxlength="150" />
            </div>
          </div>

          <div class="form-grid">
            <div>
              <label for="concurso-initial-date">Início das inscrições</label>
              <input id="concurso-initial-date" v-model="form.initialRegistrationDate" type="datetime-local" required />
            </div>
            <div>
              <label for="concurso-final-date">Fim das inscrições</label>
              <input id="concurso-final-date" v-model="form.finalRegistrationDate" type="datetime-local" required />
            </div>
          </div>

          <div class="form-grid">
            <div>
              <label for="concurso-format">Formato</label>
              <input id="concurso-format" v-model="form.format" required placeholder="Ex.: prova objetiva" />
            </div>
            <div>
              <label for="concurso-regime">Regime</label>
              <select id="concurso-regime" v-model="form.regime" required>
                <option disabled value="">Selecione o regime</option>
                <option value="estatutário">Estatutário</option>
                <option value="celetista">Celetista</option>
              </select>
            </div>
          </div>

          <label for="concurso-link">Link do concurso</label>
          <input id="concurso-link" v-model="form.link" type="url" required placeholder="https://" />

          <label for="concurso-banca">Banca</label>
          <select id="concurso-banca" v-model="form.bancaId" required>
            <option disabled value="">Selecione uma banca</option>
            <option v-for="banca in bancas" :key="banca.id" :value="banca.id">
              {{ banca.name }} ({{ banca.surname }})
            </option>
          </select>

          <label for="concurso-knowledges">Conhecimentos</label>
          <textarea
            id="concurso-knowledges"
            v-model="form.knowledgesText"
            rows="4"
            placeholder="Informe um conhecimento por linha"
          />

          <div class="form-grid">
            <div>
              <label for="concurso-notice">Edital (nome ou endereço)</label>
              <input id="concurso-notice" v-model="form.publicNotice" maxlength="250" />
            </div>
            <div>
              <label for="concurso-notice-date">Data do edital</label>
              <input id="concurso-notice-date" v-model="form.publicNoticeDate" type="datetime-local" required />
            </div>
          </div>

          <label class="active-toggle">
            <input v-model="form.active" type="checkbox" />
            Concurso ativo
          </label>

          <p v-if="formError" class="alert-message" role="alert">{{ formError }}</p>

          <div class="dialog-actions">
            <button class="secondary-button" type="button" :disabled="isSaving" @click="closeForm">
              Cancelar
            </button>
            <button class="primary-button" type="submit" :disabled="isSaving">
              {{ isSaving ? 'Salvando...' : editingConcursoId ? 'Salvar alterações' : 'Cadastrar concurso' }}
            </button>
          </div>
        </form>
      </section>
    </div>

    <div v-if="auditConcurso" class="modal-backdrop" @click.self="closeAudit">
      <section
        class="audit-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="audit-title"
      >
        <div class="dialog-heading">
          <div>
            <span class="eyebrow">HISTÓRICO DO REGISTRO</span>
            <h2 id="audit-title">Auditoria</h2>
            <p class="audit-concurso-title">{{ auditConcurso.title }}</p>
          </div>
          <button class="close-button" type="button" aria-label="Fechar" @click="closeAudit">×</button>
        </div>

        <dl class="audit-fields">
          <div>
            <dt>Criado por</dt>
            <dd>{{ auditConcurso.createdByEmail || 'Não informado' }}</dd>
          </div>
          <div>
            <dt>Data e horário da criação</dt>
            <dd>{{ formatDateTime(auditConcurso.createdAt) }}</dd>
          </div>
          <div>
            <dt>Editado por</dt>
            <dd>{{ auditConcurso.editedByEmail || 'Ainda não editado' }}</dd>
          </div>
          <div>
            <dt>Data e horário da última atualização</dt>
            <dd>{{ formatDateTime(auditConcurso.updatedAt) }}</dd>
          </div>
        </dl>
      </section>
    </div>
  </main>
</template>

<style scoped>
.concursos-page {
  min-height: 100vh;
  color: #26332c;
  background: #f7f9f7;
}

.topbar {
  display: flex;
  height: 74px;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 0 clamp(22px, 6vw, 88px);
  border-bottom: 1px solid #e8ece8;
  background: #fff;
}

.brand {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 10px;
  color: #1b332a;
  font-size: 23px;
  font-weight: 750;
  letter-spacing: -1.2px;
  text-decoration: none;
}

.brand-mark {
  display: grid;
  width: 32px;
  height: 32px;
  place-items: center;
  border-radius: 10px;
  color: #1b332a;
  background: #c1e17d;
  font-size: 21px;
  font-weight: 700;
}

.brand-period {
  color: #638b40;
}

.main-nav {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-right: auto;
  margin-left: clamp(10px, 4vw, 42px);
}

.main-nav a,
.text-button,
.action-button {
  padding: 8px 10px;
  border: 0;
  border-radius: 6px;
  color: #68756d;
  background: transparent;
  cursor: pointer;
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  text-decoration: none;
}

.main-nav a.is-current,
.main-nav a:hover {
  color: #315a3b;
  background: #f0f5eb;
}

.text-button:hover,
.action-button:hover {
  color: #315a3b;
}

.content {
  width: min(1120px, calc(100% - 48px));
  margin: 0 auto;
  padding: 56px 0 80px;
}

.page-heading,
.list-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
}

.eyebrow {
  color: #668b45;
  font-size: 10px;
  font-weight: 750;
  letter-spacing: 1.4px;
}

h1 {
  margin: 6px 0 4px;
  color: #1d2924;
  font-size: 34px;
  font-weight: 680;
  letter-spacing: -1.4px;
}

.page-heading p,
.detail-heading p {
  color: #818a85;
  font-size: 14px;
}

.primary-button,
.secondary-button {
  display: inline-flex;
  min-height: 42px;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 17px;
  border: 0;
  border-radius: 8px;
  cursor: pointer;
  font: inherit;
  font-size: 13px;
  font-weight: 700;
  transition: background-color 150ms ease;
}

.primary-button {
  color: #1d3024;
  background: #c1e17d;
}

.primary-button:hover:not(:disabled) {
  background: #b4d86c;
}

.primary-button span {
  font-size: 19px;
  line-height: 1;
}

.secondary-button {
  border: 1px solid #dfe6df;
  color: #45554a;
  background: #fff;
}

.secondary-button:hover:not(:disabled) {
  background: #f4f7f3;
}

button:disabled {
  cursor: wait;
  opacity: 0.65;
}

.list-toolbar {
  margin: 36px 0 14px;
}

.search-field {
  display: flex;
  width: min(100%, 400px);
  height: 42px;
  align-items: center;
  gap: 10px;
  padding: 0 12px;
  border: 1px solid #e1e7e2;
  border-radius: 8px;
  background: #fff;
}

.search-field svg {
  width: 17px;
  flex: 0 0 auto;
  stroke: #8c9890;
  stroke-linecap: round;
  stroke-width: 1.6;
}

.search-field input {
  width: 100%;
  border: 0;
  outline: 0;
  color: #303b36;
  background: transparent;
  font: inherit;
  font-size: 12px;
}

.total-count {
  color: #818a85;
  font-size: 12px;
}

.followed-section {
  margin: 28px 0 24px;
  padding: 22px;
  border: 1px solid #e4ebdf;
  border-radius: 10px;
  background: #fff;
}

.followed-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 14px;
}

.followed-heading h2 {
  margin: 5px 0 0;
  color: #1d2924;
  font-size: 19px;
  font-weight: 680;
  letter-spacing: -0.5px;
}

.followed-count {
  color: #668b45;
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
}

.followed-empty {
  padding: 15px 0 3px;
  color: #818a85;
  font-size: 13px;
}

.followed-error {
  padding: 12px 0 3px;
  color: #b83c36;
  font-size: 12px;
}

.followed-list {
  display: flex;
  flex-direction: column;
  padding: 0;
  list-style: none;
}

.followed-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 14px 0;
  border-top: 1px solid #edf0ed;
}

.followed-link {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 4px;
  color: inherit;
  text-decoration: none;
}

.followed-link:hover .followed-item-title {
  color: #527343;
}

.followed-item-title {
  overflow: hidden;
  color: #303b36;
  font-size: 13px;
  font-weight: 650;
  text-overflow: ellipsis;
}

.followed-item-meta {
  color: #818a85;
  font-size: 11px;
}

.table-card,
.detail-card {
  overflow: hidden;
  border: 1px solid #e6ebe6;
  border-radius: 10px;
  background: #fff;
  box-shadow: 0 4px 18px rgb(25 48 36 / 3%);
}

.table-scroll {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
  white-space: nowrap;
}

th {
  height: 48px;
  padding: 0 16px;
  color: #818a85;
  background: #fafbfa;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.4px;
  text-transform: uppercase;
}

td {
  height: 66px;
  padding: 10px 16px;
  border-top: 1px solid #edf0ed;
  color: #5b6860;
  font-size: 12px;
}

.item-name,
.item-subtitle {
  display: block;
}

.item-name {
  max-width: 260px;
  overflow: hidden;
  color: #303b36;
  font-weight: 650;
  text-overflow: ellipsis;
}

.item-subtitle {
  margin-top: 2px;
  color: #909a94;
  font-size: 11px;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 9px;
  border-radius: 20px;
  font-size: 10px;
  font-weight: 700;
  white-space: nowrap;
}

.is-active {
  color: #3b713d;
  background: #edf7e9;
}

.is-inactive {
  color: #707a73;
  background: #f0f2f0;
}

.row-actions,
.detail-actions {
  display: flex;
  align-items: center;
  gap: 2px;
}

.action-button {
  display: inline-flex;
  align-items: center;
  font-size: 11px;
}

.delete-action,
.delete-button {
  color: #b34640;
}

.follow-action,
.follow-button {
  color: #527343;
}

.follow-button {
  display: inline-flex;
  min-height: 42px;
  align-items: center;
  justify-content: center;
  padding: 0 17px;
  border: 1px solid #cbd9c3;
  border-radius: 8px;
  background: #f5f9f1;
  cursor: pointer;
  font: inherit;
  font-size: 13px;
  font-weight: 700;
}

.follow-button:hover:not(:disabled) {
  background: #ebf3e5;
}

.empty-state {
  display: flex;
  min-height: 220px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 28px;
  color: #818a85;
  font-size: 13px;
  text-align: center;
}

.empty-state strong {
  color: #303b36;
  font-size: 15px;
}

.empty-state .secondary-button {
  margin-top: 8px;
}

.back-link {
  display: inline-block;
  margin-bottom: 24px;
  color: #527343;
  font-size: 13px;
  font-weight: 650;
  text-decoration: none;
}

.back-link:hover {
  text-decoration: underline;
}

.detail-card {
  padding: clamp(22px, 4vw, 36px);
}

.detail-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  padding-bottom: 24px;
  border-bottom: 1px solid #edf0ed;
}

.detail-heading h1 {
  overflow-wrap: anywhere;
}

.detail-fields {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 36px;
  margin: 0;
}

.detail-fields > div {
  padding: 16px 0;
  border-bottom: 1px solid #edf0ed;
}

.detail-fields dt {
  margin-bottom: 5px;
  color: #818a85;
  font-size: 11px;
}

.detail-fields dd {
  overflow-wrap: anywhere;
  color: #303b36;
  font-size: 13px;
  font-weight: 600;
}

.detail-fields a {
  color: #527343;
}

.knowledge-list {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  padding: 0;
  list-style: none;
}

.knowledge-list li {
  padding: 4px 8px;
  border-radius: 5px;
  color: #526158;
  background: #f2f5f1;
  font-size: 11px;
}

.detail-actions {
  justify-content: flex-end;
  gap: 10px;
  margin-top: 24px;
}

.follow-controls {
  display: flex;
  justify-content: flex-end;
  margin-top: 24px;
}

.admin-actions {
  margin-top: 12px;
}

.alert-message {
  margin: 0 0 14px;
  color: #b83c36;
  font-size: 12px;
  line-height: 1.5;
}

.modal-backdrop {
  position: fixed;
  z-index: 5;
  inset: 0;
  display: grid;
  overflow-y: auto;
  place-items: center;
  padding: 24px;
  background: rgb(16 29 22 / 48%);
}

.concurso-dialog {
  width: min(100%, 680px);
  max-height: calc(100vh - 48px);
  overflow-y: auto;
  padding: 28px;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 20px 70px rgb(0 0 0 / 18%);
}

.audit-dialog {
  width: min(100%, 480px);
  padding: 28px;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 20px 70px rgb(0 0 0 / 18%);
}

.dialog-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 22px;
}

h2 {
  margin-top: 5px;
  color: #1d2924;
  font-size: 23px;
  font-weight: 680;
  letter-spacing: -0.7px;
}

.audit-concurso-title {
  margin-top: 5px;
  color: #818a85;
  font-size: 12px;
}

.audit-fields {
  margin: 0;
}

.audit-fields > div {
  padding: 14px 0;
  border-top: 1px solid #edf0ed;
}

.audit-fields dt {
  margin-bottom: 4px;
  color: #818a85;
  font-size: 11px;
}

.audit-fields dd {
  overflow-wrap: anywhere;
  color: #303b36;
  font-size: 13px;
  font-weight: 600;
}

.close-button {
  width: 32px;
  height: 32px;
  border: 0;
  border-radius: 7px;
  color: #68756d;
  background: #f3f5f3;
  cursor: pointer;
  font-size: 23px;
  line-height: 1;
}

.concurso-form {
  display: flex;
  flex-direction: column;
}

.concurso-form label:not(.active-toggle),
.form-grid label {
  display: block;
  margin: 0 0 6px;
  color: #46534b;
  font-size: 12px;
  font-weight: 650;
}

.concurso-form > input,
.concurso-form > select,
.concurso-form textarea,
.form-grid select,
.form-grid input {
  width: 100%;
  min-width: 0;
  margin-bottom: 15px;
  padding: 10px 12px;
  border: 1px solid #e1e7e2;
  border-radius: 7px;
  outline: none;
  color: #303b36;
  background: #fff;
  font: inherit;
  font-size: 13px;
}

.concurso-form > input,
.concurso-form > select,
.form-grid select,
.form-grid input {
  height: 42px;
}

.concurso-form textarea {
  resize: vertical;
}

.concurso-form > input:focus,
.concurso-form > select:focus,
.form-grid select:focus,
.concurso-form textarea:focus,
.form-grid input:focus {
  border-color: #749450;
  box-shadow: 0 0 0 3px rgb(116 148 80 / 12%);
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 14px;
}

.active-toggle {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  margin: 0 0 18px;
  color: #46534b;
  font-size: 12px;
  font-weight: 600;
}

.active-toggle input {
  width: 16px;
  height: 16px;
  accent-color: #628544;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 5px;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  clip-path: inset(50%);
}

@media (max-width: 700px) {
  .topbar {
    gap: 8px;
    padding: 0 16px;
  }

  .main-nav {
    gap: 0;
    margin-left: 4px;
  }

  .main-nav a,
  .text-button {
    padding-right: 7px;
    padding-left: 7px;
    font-size: 11px;
  }

  .content {
    width: min(100% - 32px, 1120px);
    padding-top: 36px;
  }

  .page-heading {
    align-items: flex-start;
  }

  .page-heading .primary-button {
    flex: 0 0 auto;
  }

  .list-toolbar {
    align-items: flex-start;
    flex-direction: column;
    gap: 10px;
  }

  .search-field {
    width: 100%;
  }

  .followed-section {
    padding: 18px;
  }

  .followed-item {
    align-items: flex-start;
  }

  .concurso-dialog {
    padding: 22px;
  }
}

@media (max-width: 460px) {
  .topbar {
    height: 64px;
  }

  .brand {
    gap: 6px;
    font-size: 19px;
  }

  .brand-mark {
    width: 28px;
    height: 28px;
  }

  .main-nav a,
  .text-button {
    padding-right: 5px;
    padding-left: 5px;
    font-size: 10px;
  }

  .page-heading {
    flex-direction: column;
  }

  .form-grid,
  .detail-fields {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
