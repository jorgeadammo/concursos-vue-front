import { getAuthSession, getAuthorizationHeader } from './auth'

export interface ConcursoBanca {
  id: string
  name: string
  surname: string
  phone: string
  active: boolean
  address: string
  createdAt: string
  updatedAt: string
}

export interface Concurso {
  id: string
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
  knowledges: string[]
  publicNotice: string | null
  publicNoticeDate: string
  active: boolean
  bancaId: string
  banca: ConcursoBanca | null
  isFollowing?: boolean
  createdByEmail: string
  editedByEmail: string | null
  createdAt: string
  updatedAt: string
}

export interface ConcursoFollow {
  id: string
  userId: string
  concursoId: string
  createdAt: string
  concurso: Concurso
}

export type ConcursoInput = Pick<
  Concurso,
  | 'title'
  | 'year'
  | 'entity'
  | 'uf'
  | 'administration'
  | 'initialRegistrationDate'
  | 'finalRegistrationDate'
  | 'format'
  | 'regime'
  | 'link'
  | 'knowledges'
  | 'publicNotice'
  | 'publicNoticeDate'
  | 'active'
  | 'bancaId'
>

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api').replace(
  /\/$/,
  '',
)
const concursosUrl = `${apiBaseUrl}/concursos`
const followedConcursosStoragePrefix = 'aprova.followed-concursos'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isConcursoBanca(value: unknown): value is ConcursoBanca {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.surname === 'string' &&
    typeof value.phone === 'string' &&
    typeof value.active === 'boolean' &&
    typeof value.address === 'string' &&
    typeof value.createdAt === 'string' &&
    typeof value.updatedAt === 'string'
  )
}

function isConcurso(value: unknown): value is Concurso {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.title === 'string' &&
    typeof value.year === 'number' &&
    typeof value.entity === 'string' &&
    typeof value.uf === 'string' &&
    typeof value.administration === 'string' &&
    typeof value.initialRegistrationDate === 'string' &&
    typeof value.finalRegistrationDate === 'string' &&
    typeof value.format === 'string' &&
    typeof value.regime === 'string' &&
    typeof value.link === 'string' &&
    Array.isArray(value.knowledges) &&
    value.knowledges.every((knowledge) => typeof knowledge === 'string') &&
    (typeof value.publicNotice === 'string' || value.publicNotice === null) &&
    typeof value.publicNoticeDate === 'string' &&
    typeof value.active === 'boolean' &&
    typeof value.bancaId === 'string' &&
    (value.banca === null || isConcursoBanca(value.banca)) &&
    (value.isFollowing === undefined || typeof value.isFollowing === 'boolean') &&
    typeof value.createdByEmail === 'string' &&
    (typeof value.editedByEmail === 'string' || value.editedByEmail === null) &&
    typeof value.createdAt === 'string' &&
    typeof value.updatedAt === 'string'
  )
}

function isConcursoFollow(value: unknown): value is ConcursoFollow {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.userId === 'string' &&
    typeof value.concursoId === 'string' &&
    typeof value.createdAt === 'string' &&
    isConcurso(value.concurso)
  )
}

function getFollowedConcursosStorageKey(): string | null {
  const session = getAuthSession()
  return session ? `${followedConcursosStoragePrefix}.${session.user.id}` : null
}

function getFollowedConcursoIds(): Set<string> {
  const storageKey = getFollowedConcursosStorageKey()
  if (!storageKey) return new Set()

  try {
    const storedIds: unknown = JSON.parse(sessionStorage.getItem(storageKey) ?? '[]')
    return Array.isArray(storedIds) && storedIds.every((id) => typeof id === 'string')
      ? new Set(storedIds)
      : new Set()
  } catch {
    sessionStorage.removeItem(storageKey)
    return new Set()
  }
}

function setConcursoFollowing(id: string, isFollowing: boolean): void {
  const storageKey = getFollowedConcursosStorageKey()
  if (!storageKey) return

  const followedIds = getFollowedConcursoIds()
  if (isFollowing) {
    followedIds.add(id)
  } else {
    followedIds.delete(id)
  }

  sessionStorage.setItem(storageKey, JSON.stringify([...followedIds]))
}

function applyFollowState(concurso: Concurso): Concurso {
  return {
    ...concurso,
    isFollowing:
      typeof concurso.isFollowing === 'boolean'
        ? concurso.isFollowing
        : getFollowedConcursoIds().has(concurso.id),
  }
}

async function getErrorMessage(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json()
    if (isRecord(body)) {
      if (typeof body.message === 'string') return body.message
      if (typeof body.error === 'string') return body.error
    }
  } catch {
    return 'O servidor retornou uma resposta inválida. Tente novamente.'
  }

  return `Não foi possível concluir a operação (erro ${response.status}).`
}

async function request(url: string, init?: RequestInit): Promise<Response> {
  const authorization = getAuthorizationHeader()
  const response = await fetch(url, {
    ...init,
    headers: {
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(authorization ? { Authorization: authorization } : {}),
      ...init?.headers,
    },
  })

  if (!response.ok) {
    throw new Error(await getErrorMessage(response))
  }

  return response
}

async function parseConcurso(response: Response): Promise<Concurso> {
  let body: unknown
  try {
    body = await response.json()
  } catch {
    throw new Error('O servidor retornou um concurso inválido.')
  }

  if (!isRecord(body) || !isConcurso(body.data)) {
    throw new Error('A resposta dos dados do concurso está incompleta.')
  }

  return body.data
}

export async function listConcursos(): Promise<{ items: Concurso[]; total: number }> {
  const response = await request(concursosUrl)
  let body: unknown

  try {
    body = await response.json()
  } catch {
    throw new Error('O servidor retornou uma lista inválida de concursos.')
  }

  if (
    !isRecord(body) ||
    !Array.isArray(body.data) ||
    !body.data.every(isConcurso) ||
    !isRecord(body.meta) ||
    typeof body.meta.total !== 'number'
  ) {
    throw new Error('A resposta da listagem de concursos está incompleta.')
  }

  return { items: body.data.map(applyFollowState), total: body.meta.total }
}

export async function listFollowedConcursos(): Promise<{
  items: ConcursoFollow[]
  total: number
}> {
  const response = await request(`${concursosUrl}/followed`)
  let body: unknown

  try {
    body = await response.json()
  } catch {
    throw new Error('O servidor retornou uma lista inválida de acompanhamentos.')
  }

  if (
    !isRecord(body) ||
    !Array.isArray(body.data) ||
    !body.data.every(isConcursoFollow) ||
    !isRecord(body.meta) ||
    typeof body.meta.total !== 'number'
  ) {
    throw new Error('A resposta dos concursos acompanhados está incompleta.')
  }

  return { items: body.data, total: body.meta.total }
}

export async function getConcurso(id: string): Promise<Concurso> {
  const concurso = await parseConcurso(
    await request(`${concursosUrl}/${encodeURIComponent(id)}`),
  )
  return applyFollowState(concurso)
}

export async function createConcurso(input: ConcursoInput): Promise<void> {
  await request(concursosUrl, {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function updateConcurso(id: string, input: ConcursoInput): Promise<void> {
  await request(`${concursosUrl}/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  })
}

export async function deleteConcurso(id: string): Promise<void> {
  await request(`${concursosUrl}/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
}

export async function followConcurso(id: string): Promise<void> {
  await request(`${concursosUrl}/${encodeURIComponent(id)}/follow`, {
    method: 'POST',
  })
  setConcursoFollowing(id, true)
}

export async function unfollowConcurso(id: string): Promise<void> {
  await request(`${concursosUrl}/${encodeURIComponent(id)}/follow`, {
    method: 'DELETE',
  })
  setConcursoFollowing(id, false)
}
