import { getAuthorizationHeader } from './auth'

export interface Banca {
  id: string
  name: string
  surname: string
  phone: string
  address: string
  active: boolean
  createdAt: string
  updatedAt: string
}

export type BancaInput = Pick<Banca, 'name' | 'surname' | 'phone' | 'address' | 'active'>

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api').replace(
  /\/$/,
  '',
)
const bancasUrl = `${apiBaseUrl}/bancas`

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isBanca(value: unknown): value is Banca {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.surname === 'string' &&
    typeof value.phone === 'string' &&
    typeof value.address === 'string' &&
    typeof value.active === 'boolean' &&
    typeof value.createdAt === 'string' &&
    typeof value.updatedAt === 'string'
  )
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

export async function listBancas(): Promise<{ items: Banca[]; total: number }> {
  const response = await request(bancasUrl)
  let body: unknown

  try {
    body = await response.json()
  } catch {
    throw new Error('O servidor retornou uma lista inválida de bancas.')
  }

  if (
    !isRecord(body) ||
    !Array.isArray(body.data) ||
    !body.data.every(isBanca) ||
    !isRecord(body.meta) ||
    typeof body.meta.total !== 'number'
  ) {
    throw new Error('A resposta da listagem de bancas está incompleta.')
  }

  return { items: body.data, total: body.meta.total }
}

export async function getBanca(id: string): Promise<Banca> {
  const response = await request(`${bancasUrl}/${encodeURIComponent(id)}`)
  let body: unknown

  try {
    body = await response.json()
  } catch {
    throw new Error('O servidor retornou uma banca inválida.')
  }

  if (!isRecord(body) || !isBanca(body.data)) {
    throw new Error('A resposta dos dados da banca está incompleta.')
  }

  return body.data
}

export async function createBanca(input: BancaInput): Promise<void> {
  await request(bancasUrl, {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function updateBanca(id: string, input: BancaInput): Promise<void> {
  await request(`${bancasUrl}/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  })
}

export async function deleteBanca(id: string): Promise<void> {
  await request(`${bancasUrl}/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
}
