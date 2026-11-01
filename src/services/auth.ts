export interface AuthUser {
  id: string
  name: string
  email: string
  role: string
  area: string
}

export interface AuthSession {
  tokenType: string
  expiresIn: string
  token: string
  user: AuthUser
}

const SESSION_STORAGE_KEY = 'aprova.auth-session'
const loginUrl =
  import.meta.env.VITE_AUTH_LOGIN_URL || 'http://localhost:3000/api/auth/login'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isAuthUser(value: unknown): value is AuthUser {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.email === 'string' &&
    typeof value.role === 'string' &&
    typeof value.area === 'string'
  )
}

function isAuthSession(value: unknown): value is AuthSession {
  return (
    isRecord(value) &&
    typeof value.tokenType === 'string' &&
    /^[a-z][a-z0-9+.-]*$/i.test(value.tokenType) &&
    typeof value.expiresIn === 'string' &&
    typeof value.token === 'string' &&
    value.token.length > 0 &&
    isAuthUser(value.user)
  )
}

function getTokenExpiration(token: string): number | null {
  const payload = token.split('.')[1]
  if (!payload) return null

  try {
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/')
    const decoded = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='))
    const bytes = Uint8Array.from(decoded, (character) => character.charCodeAt(0))
    const claims: unknown = JSON.parse(new TextDecoder().decode(bytes))
    return isRecord(claims) && typeof claims.exp === 'number' && Number.isFinite(claims.exp)
      ? claims.exp * 1000
      : null
  } catch {
    return null
  }
}

export function isAuthSessionExpired(session: AuthSession): boolean {
  const expiresAt = getTokenExpiration(session.token)
  return expiresAt !== null && expiresAt <= Date.now()
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

  return 'Não foi possível entrar. Confira seus dados e tente novamente.'
}

export async function login(email: string, password: string): Promise<AuthSession> {
  const response = await fetch(loginUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email: email.trim(), password }),
  })

  if (!response.ok) {
    throw new Error(await getErrorMessage(response))
  }

  let body: unknown
  try {
    body = await response.json()
  } catch {
    throw new Error('O servidor retornou uma resposta inválida. Tente novamente.')
  }

  if (!isRecord(body) || !isAuthSession(body.data)) {
    throw new Error('A resposta de autenticação está incompleta. Tente novamente.')
  }

  sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(body.data))
  return body.data
}

export function getAuthSession(): AuthSession | null {
  const storedSession = sessionStorage.getItem(SESSION_STORAGE_KEY)
  if (!storedSession) return null

  try {
    const session: unknown = JSON.parse(storedSession)
    if (isAuthSession(session) && !isAuthSessionExpired(session)) return session
  } catch {
    sessionStorage.removeItem(SESSION_STORAGE_KEY)
    return null
  }

  sessionStorage.removeItem(SESSION_STORAGE_KEY)
  return null
}

export function getAuthorizationHeader(): string | null {
  const session = getAuthSession()
  return session ? `${session.tokenType} ${session.token}` : null
}

export function logout(): void {
  sessionStorage.removeItem(SESSION_STORAGE_KEY)
}
