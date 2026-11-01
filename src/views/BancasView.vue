<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getAuthSession, logout } from '../services/auth'
import { notifyError } from '../services/notifications'
import {
  createBanca,
  deleteBanca,
  getBanca,
  listBancas,
  updateBanca,
  type Banca,
  type BancaInput,
} from '../services/bancas'

const router = useRouter()
const route = useRoute()
const bancas = ref<Banca[]>([])
const selectedBanca = ref<Banca | null>(null)
const total = ref(0)
const search = ref('')
const isLoading = ref(true)
const isSaving = ref(false)
const errorMessage = ref('')
const formError = ref('')
const isFormOpen = ref(false)
const editingBancaId = ref<string | null>(null)
const bancaId = computed(() => (typeof route.params.id === 'string' ? route.params.id : null))
const isAdmin = computed(() => getAuthSession()?.user.role.toLowerCase() === 'admin')

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof TypeError) {
    return 'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.'
  }
  return error instanceof Error ? error.message : fallback
}

const emptyForm = (): BancaInput => ({
  name: '',
  surname: '',
  phone: '',
  address: '',
  active: true,
})

const form = reactive<BancaInput>(emptyForm())

const filteredBancas = computed(() => {
  const query = search.value.trim().toLocaleLowerCase('pt-BR')
  if (!query) return bancas.value

  return bancas.value.filter((banca) =>
    [banca.name, banca.surname, banca.phone, banca.address]
      .join(' ')
      .toLocaleLowerCase('pt-BR')
      .includes(query),
  )
})

async function loadBancas() {
  errorMessage.value = ''
  isLoading.value = true

  try {
    const result = await listBancas()
    bancas.value = result.items
    total.value = result.total
  } catch (error) {
    errorMessage.value = getErrorMessage(error, 'Ocorreu um erro inesperado ao carregar as bancas.')
    notifyError(errorMessage.value)
  } finally {
    isLoading.value = false
  }
}

async function loadBanca(id: string) {
  errorMessage.value = ''
  isLoading.value = true
  selectedBanca.value = null

  try {
    selectedBanca.value = await getBanca(id)
  } catch (error) {
    errorMessage.value = getErrorMessage(error, 'Ocorreu um erro inesperado ao carregar a banca.')
    notifyError(errorMessage.value)
  } finally {
    isLoading.value = false
  }
}

function openCreateForm() {
  if (!isAdmin.value) return
  editingBancaId.value = null
  Object.assign(form, emptyForm())
  formError.value = ''
  isFormOpen.value = true
}

function openEditForm(banca: Banca) {
  if (!isAdmin.value) return
  editingBancaId.value = banca.id
  Object.assign(form, {
    name: banca.name,
    surname: banca.surname,
    phone: banca.phone,
    address: banca.address,
    active: banca.active,
  })
  formError.value = ''
  isFormOpen.value = true
}

function closeForm() {
  isFormOpen.value = false
  formError.value = ''
}

async function saveBanca() {
  if (!isAdmin.value) return
  formError.value = ''
  isSaving.value = true

  const input: BancaInput = {
    name: form.name.trim(),
    surname: form.surname.trim(),
    phone: form.phone.trim(),
    address: form.address.trim(),
    active: form.active,
  }

  try {
    if (editingBancaId.value) {
      await updateBanca(editingBancaId.value, input)
    } else {
      await createBanca(input)
    }

    closeForm()
    if (bancaId.value) {
      await loadBanca(bancaId.value)
    } else {
      await loadBancas()
    }
  } catch (error) {
    formError.value = getErrorMessage(error, 'Ocorreu um erro inesperado ao salvar a banca.')
    notifyError(formError.value)
  } finally {
    isSaving.value = false
  }
}

async function removeBanca(banca: Banca) {
  if (!isAdmin.value) return
  if (!window.confirm(`Tem certeza que deseja excluir a banca "${banca.name}"?`)) return

  errorMessage.value = ''
  try {
    await deleteBanca(banca.id)
    if (bancaId.value === banca.id) {
      void router.push({ name: 'bancas' })
    } else {
      await loadBancas()
    }
  } catch (error) {
    errorMessage.value = getErrorMessage(error, 'Ocorreu um erro inesperado ao excluir a banca.')
    notifyError(errorMessage.value)
  }
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('pt-BR').format(new Date(value))
}

function signOut() {
  logout()
  void router.push({ name: 'login' })
}

watch(
  bancaId,
  (id) => {
    if (id) {
      void loadBanca(id)
    } else {
      void loadBancas()
    }
  },
  { immediate: true },
)
</script>

<template>
  <main class="bancas-page">
    <header class="topbar">
      <RouterLink class="brand" to="/" aria-label="Aprova, página inicial">
        <span class="brand-mark" aria-hidden="true">✓</span>
        <span>aprova<span class="brand-period">.</span></span>
      </RouterLink>
      <nav class="main-nav" aria-label="Navegação principal">
        <RouterLink :to="{ name: 'concursos' }">Concursos</RouterLink>
        <RouterLink :to="{ name: 'bancas' }" active-class="is-current">Bancas</RouterLink>
      </nav>
      <button class="text-button" type="button" @click="signOut">Sair da conta</button>
    </header>

    <section v-if="bancaId" class="content" aria-labelledby="detail-title">
      <RouterLink class="back-link" :to="{ name: 'bancas' }">← Voltar para bancas</RouterLink>
      <p v-if="errorMessage" class="alert-message" role="alert">{{ errorMessage }}</p>
      <div v-if="isLoading" class="empty-state" role="status">Carregando banca...</div>
      <div v-else-if="selectedBanca" class="detail-card">
        <div class="detail-heading">
          <div>
            <span class="eyebrow">DETALHES DA BANCA</span>
            <h1 id="detail-title">{{ selectedBanca.name }}</h1>
            <p>{{ selectedBanca.surname }}</p>
          </div>
          <span class="status-badge" :class="selectedBanca.active ? 'is-active' : 'is-inactive'">
            {{ selectedBanca.active ? 'Ativa' : 'Inativa' }}
          </span>
        </div>

        <dl class="detail-fields">
          <div>
            <dt>Telefone</dt>
            <dd>{{ selectedBanca.phone || '—' }}</dd>
          </div>
          <div>
            <dt>Endereço</dt>
            <dd>{{ selectedBanca.address || '—' }}</dd>
          </div>
          <div>
            <dt>Criada em</dt>
            <dd>{{ formatDate(selectedBanca.createdAt) }}</dd>
          </div>
          <div>
            <dt>Última atualização</dt>
            <dd>{{ formatDate(selectedBanca.updatedAt) }}</dd>
          </div>
        </dl>

        <div v-if="isAdmin" class="detail-actions">
          <button class="secondary-button" type="button" @click="openEditForm(selectedBanca)">
            Editar banca
          </button>
          <button
            class="secondary-button delete-button"
            type="button"
            @click="removeBanca(selectedBanca)"
          >
            Excluir banca
          </button>
        </div>
      </div>
    </section>

    <section v-else class="content" aria-labelledby="page-title">
      <div class="page-heading">
        <div>
          <span class="eyebrow">CONSULTA E GESTÃO</span>
          <h1 id="page-title">Bancas</h1>
          <p>Consulte as bancas organizadoras e seus detalhes.</p>
        </div>
        <button v-if="isAdmin" class="primary-button" type="button" @click="openCreateForm">
          <span aria-hidden="true">+</span>
          Nova banca
        </button>
      </div>

      <div class="list-toolbar">
        <label class="search-field">
          <span class="sr-only">Buscar bancas</span>
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="10.8" cy="10.8" r="6.8" />
            <path d="m16 16 4.5 4.5" />
          </svg>
          <input v-model="search" type="search" placeholder="Buscar por nome, sigla ou telefone" />
        </label>
        <span class="total-count">{{ total }} {{ total === 1 ? 'banca cadastrada' : 'bancas cadastradas' }}</span>
      </div>

      <p v-if="errorMessage" class="alert-message" role="alert">{{ errorMessage }}</p>

      <div class="table-card">
        <div v-if="isLoading" class="empty-state" role="status">Carregando bancas...</div>
        <div v-else-if="filteredBancas.length === 0" class="empty-state">
          <strong>{{ search ? 'Nenhuma banca encontrada' : 'Nenhuma banca cadastrada' }}</strong>
          <span>{{ search ? 'Tente outra busca.' : 'Ainda não há bancas para exibir.' }}</span>
          <button v-if="!search && isAdmin" class="secondary-button" type="button" @click="openCreateForm">
            Cadastrar banca
          </button>
        </div>
        <div v-else class="table-scroll">
          <table>
            <thead>
              <tr>
                <th scope="col">Banca</th>
                <th scope="col">Telefone</th>
                <th scope="col">Endereço</th>
                <th scope="col">Status</th>
                <th scope="col">Criada em</th>
                <th scope="col"><span class="sr-only">Ações</span></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="banca in filteredBancas" :key="banca.id">
                <td>
                  <strong class="banca-name">{{ banca.name }}</strong>
                  <span class="banca-surname">{{ banca.surname }}</span>
                </td>
                <td>{{ banca.phone || '—' }}</td>
                <td class="address-cell">{{ banca.address || '—' }}</td>
                <td>
                  <span class="status-badge" :class="banca.active ? 'is-active' : 'is-inactive'">
                    {{ banca.active ? 'Ativa' : 'Inativa' }}
                  </span>
                </td>
                <td>{{ formatDate(banca.createdAt) }}</td>
                <td>
                  <div class="row-actions">
                    <RouterLink class="action-button" :to="{ name: 'banca-detail', params: { id: banca.id } }">
                      Visualizar
                    </RouterLink>
                    <template v-if="isAdmin">
                      <button class="action-button" type="button" @click="openEditForm(banca)">
                        Editar
                      </button>
                      <button
                        class="action-button delete-action"
                        type="button"
                        @click="removeBanca(banca)"
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
        class="banca-dialog"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="editingBancaId ? 'edit-banca-title' : 'new-banca-title'"
      >
        <div class="dialog-heading">
          <div>
            <span class="eyebrow">{{ editingBancaId ? 'ATUALIZAÇÃO' : 'CADASTRO' }}</span>
            <h2 :id="editingBancaId ? 'edit-banca-title' : 'new-banca-title'">
              {{ editingBancaId ? 'Editar banca' : 'Nova banca' }}
            </h2>
          </div>
          <button class="close-button" type="button" aria-label="Fechar" @click="closeForm">×</button>
        </div>

        <form class="banca-form" @submit.prevent="saveBanca">
          <label for="banca-name">Nome</label>
          <input id="banca-name" v-model="form.name" required maxlength="120" />

          <label for="banca-surname">Sigla</label>
          <input id="banca-surname" v-model="form.surname" required maxlength="40" />

          <label for="banca-phone">Telefone</label>
          <input id="banca-phone" v-model="form.phone" type="tel" required maxlength="30" />

          <label for="banca-address">Endereço</label>
          <textarea id="banca-address" v-model="form.address" required rows="3" maxlength="250" />

          <label class="active-toggle">
            <input v-model="form.active" type="checkbox" />
            Banca ativa
          </label>

          <p v-if="formError" class="alert-message" role="alert">{{ formError }}</p>

          <div class="dialog-actions">
            <button class="secondary-button" type="button" :disabled="isSaving" @click="closeForm">
              Cancelar
            </button>
            <button class="primary-button" type="submit" :disabled="isSaving">
              {{ isSaving ? 'Salvando...' : editingBancaId ? 'Salvar alterações' : 'Cadastrar banca' }}
            </button>
          </div>
        </form>
      </section>
    </div>
  </main>
</template>

<style scoped>
.bancas-page {
  min-height: 100vh;
  color: #26332c;
  background: #f7f9f7;
}

.topbar {
  display: flex;
  height: 74px;
  align-items: center;
  justify-content: space-between;
  padding: 0 clamp(22px, 6vw, 88px);
  border-bottom: 1px solid #e8ece8;
  background: #fff;
}

.brand {
  display: inline-flex;
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

.text-button,
.action-button,
.main-nav a {
  padding: 7px 10px;
  border: 0;
  color: #526158;
  background: transparent;
  cursor: pointer;
  font: inherit;
  font-size: 13px;
  font-weight: 600;
}

.text-button:hover,
.action-button:hover {
  color: #315a3b;
}

.main-nav a.is-current,
.main-nav a:hover {
  color: #315a3b;
  background: #f0f5eb;
}

.main-nav {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-right: auto;
  margin-left: clamp(10px, 4vw, 42px);
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

.page-heading p {
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
  width: min(100%, 380px);
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

.table-card {
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

.banca-name,
.banca-surname {
  display: block;
}

.banca-name {
  color: #303b36;
  font-weight: 650;
}

.banca-surname {
  margin-top: 2px;
  color: #909a94;
  font-size: 11px;
}

.address-cell {
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 9px;
  border-radius: 20px;
  font-size: 10px;
  font-weight: 700;
}

.is-active {
  color: #3b713d;
  background: #edf7e9;
}

.is-inactive {
  color: #707a73;
  background: #f0f2f0;
}

.row-actions {
  display: flex;
  align-items: center;
}

.action-button {
  display: inline-flex;
  align-items: center;
  font-size: 11px;
  text-decoration: none;
}

.delete-action {
  color: #b34640;
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
  border: 1px solid #e6ebe6;
  border-radius: 10px;
  background: #fff;
  box-shadow: 0 4px 18px rgb(25 48 36 / 3%);
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

.detail-heading p {
  color: #818a85;
  font-size: 14px;
}

.detail-fields {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 36px;
  margin: 0;
}

.detail-fields > div {
  padding: 18px 0;
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

.detail-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 24px;
}

.delete-button {
  border-color: #f0d9d7;
  color: #b34640;
}

.delete-button:hover:not(:disabled) {
  background: #fff5f4;
}

.empty-state .secondary-button {
  margin-top: 8px;
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

.banca-dialog {
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

.banca-form {
  display: flex;
  flex-direction: column;
}

.banca-form > label:not(.active-toggle) {
  margin: 0 0 6px;
  color: #46534b;
  font-size: 12px;
  font-weight: 650;
}

.banca-form > input,
.banca-form textarea {
  width: 100%;
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

.banca-form > input {
  height: 42px;
}

.banca-form textarea {
  resize: vertical;
}

.banca-form > input:focus,
.banca-form textarea:focus {
  border-color: #749450;
  box-shadow: 0 0 0 3px rgb(116 148 80 / 12%);
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

@media (max-width: 650px) {
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

  .banca-dialog {
    padding: 22px;
  }
}

@media (max-width: 420px) {
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

  .detail-fields {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
