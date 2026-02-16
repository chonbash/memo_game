export const API_BASE =
  import.meta.env.VITE_API_BASE || 'http://localhost:8000'
const ADMIN_PASSWORD_KEY = 'memoGameAdminPassword'
const TEAM_VIDEO_PATH_KEY = 'memoGameTeam'
const REGISTRATION_ID_KEY = 'memoGameRegistrationId'
const LAST_GAME_MOVES_KEY = 'memoGameLastMoves'
const LAST_GAME_TOKEN_KEY = 'memoGameLastGameToken'
const SUBMITTED_GAME_TOKEN_KEY = 'memoGameSubmittedGameToken'
const DEFAULT_VIDEO_PATH = 'congrats.mp4'

export async function registerUser(payload) {
  const response = await fetch(`${API_BASE}/api/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || 'Ошибка регистрации')
  }

  return response.json()
}

export async function submitGameResult(payload) {
  const response = await fetch(`${API_BASE}/api/game-result`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    const message = data.detail || (await response.text()) || 'Ошибка сохранения результата'
    const err = new Error(message)
    err.status = response.status
    throw err
  }

  return response.json()
}

export async function fetchPlayedGames(registrationId) {
  const params = new URLSearchParams({ registration_id: String(registrationId) })
  const response = await fetch(`${API_BASE}/api/played-games?${params}`)
  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || 'Ошибка загрузки')
  }
  const data = await response.json()
  return data.played || []
}

export async function fetchStats(gameType = null) {
  const params = gameType ? new URLSearchParams({ game_type: gameType }) : ''
  const url = `${API_BASE}/api/stats${params ? `?${params}` : ''}`
  const response = await fetch(url)
  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || 'Ошибка загрузки статистики')
  }
  return response.json()
}

export async function fetchTeamStats(gameType = null) {
  const params = gameType ? new URLSearchParams({ game_type: gameType }) : ''
  const url = `${API_BASE}/api/team-stats${params ? `?${params}` : ''}`
  const response = await fetch(url)
  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || 'Ошибка загрузки статистики команд')
  }
  return response.json()
}

export async function fetchTeams() {
  const response = await fetch(`${API_BASE}/api/teams`)
  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || 'Ошибка загрузки команд')
  }
  return response.json()
}

export async function fetchTruthOrMythQuestions(limit = 6) {
  const params = new URLSearchParams({ limit: String(limit) })
  const response = await fetch(
    `${API_BASE}/api/truth-or-myth?${params.toString()}`,
  )
  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || 'Ошибка загрузки вопросов')
  }
  return response.json()
}

function getAdminHeaders() {
  const password = sessionStorage.getItem(ADMIN_PASSWORD_KEY)
  return password ? { 'X-Admin-Password': password } : {}
}

export async function verifyAdminPassword(password) {
  const response = await fetch(`${API_BASE}/api/admin/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  })
  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new Error(data.detail || 'Неверный пароль')
  }
  sessionStorage.setItem(ADMIN_PASSWORD_KEY, password)
  return true
}

export function clearAdminAuth() {
  sessionStorage.removeItem(ADMIN_PASSWORD_KEY)
}

export function isAdminAuthenticated() {
  return !!sessionStorage.getItem(ADMIN_PASSWORD_KEY)
}

export async function fetchAdminVideos() {
  const response = await fetch(`${API_BASE}/api/admin/videos`, {
    headers: getAdminHeaders(),
  })
  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || 'Ошибка загрузки видео')
  }
  return response.json()
}

export async function fetchAdminTeams() {
  const response = await fetch(`${API_BASE}/api/admin/teams`, {
    headers: getAdminHeaders(),
  })
  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || 'Ошибка загрузки команд')
  }
  return response.json()
}

export function saveSelectedTeam(videoPath) {
  localStorage.setItem(TEAM_VIDEO_PATH_KEY, videoPath)
}

export async function uploadAdminVideo(teamKey, file) {
  const formData = new FormData()
  formData.append('file', file)
  const encodedKey = encodeURIComponent(teamKey)
  const response = await fetch(`${API_BASE}/api/admin/videos/${encodedKey}`, {
    method: 'POST',
    headers: getAdminHeaders(),
    body: formData,
  })
  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || 'Ошибка загрузки видео')
  }
  return response.json()
}

export async function updateAdminTeam(teamKey, payload) {
  const encodedKey = encodeURIComponent(teamKey)
  const response = await fetch(`${API_BASE}/api/admin/teams/${encodedKey}`, {
    method: 'PUT',
    headers: { ...getAdminHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || 'Ошибка обновления команды')
  }
  return response.json()
}

export async function deleteAdminTeam(teamKey) {
  const encodedKey = encodeURIComponent(teamKey)
  const response = await fetch(`${API_BASE}/api/admin/teams/${encodedKey}`, {
    method: 'DELETE',
    headers: getAdminHeaders(),
  })
  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || 'Ошибка удаления команды')
  }
  return response.json()
}

export async function resetAdminResults() {
  const response = await fetch(`${API_BASE}/api/admin/reset-results`, {
    method: 'POST',
    headers: getAdminHeaders(),
  })
  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || 'Ошибка сброса результатов')
  }
  return response.json()
}

export async function fetchAdminQuestions() {
  const response = await fetch(`${API_BASE}/api/admin/questions`, {
    headers: getAdminHeaders(),
  })
  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || 'Ошибка загрузки вопросов')
  }
  return response.json()
}

export async function createAdminQuestion(payload) {
  const response = await fetch(`${API_BASE}/api/admin/questions`, {
    method: 'POST',
    headers: { ...getAdminHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || 'Ошибка создания вопроса')
  }
  return response.json()
}

export async function updateAdminQuestion(questionId, payload) {
  const response = await fetch(
    `${API_BASE}/api/admin/questions/${questionId}`,
    {
      method: 'PUT',
      headers: { ...getAdminHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
  )
  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || 'Ошибка обновления вопроса')
  }
  return response.json()
}

export async function deleteAdminQuestion(questionId) {
  const response = await fetch(
    `${API_BASE}/api/admin/questions/${questionId}`,
    {
      method: 'DELETE',
      headers: getAdminHeaders(),
    },
  )
  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || 'Ошибка удаления вопроса')
  }
  return response.json()
}

export function getSelectedTeam() {
  const storedTeam = localStorage.getItem(TEAM_VIDEO_PATH_KEY) || ''
  return storedTeam
}

export function saveRegistrationId(id) {
  localStorage.setItem(REGISTRATION_ID_KEY, String(id))
}

export function getRegistrationId() {
  const value = localStorage.getItem(REGISTRATION_ID_KEY)
  if (!value) return null
  const parsed = Number.parseInt(value, 10)
  return Number.isNaN(parsed) ? null : parsed
}

export function saveLastGame(moves) {
  const token = String(Date.now())
  localStorage.setItem(LAST_GAME_MOVES_KEY, String(moves))
  localStorage.setItem(LAST_GAME_TOKEN_KEY, token)
  return token
}

export function getLastGame() {
  const movesValue = localStorage.getItem(LAST_GAME_MOVES_KEY)
  const token = localStorage.getItem(LAST_GAME_TOKEN_KEY)
  if (!movesValue || !token) {
    return { moves: null, token: null }
  }
  const moves = Number.parseInt(movesValue, 10)
  return Number.isNaN(moves) ? { moves: null, token: null } : { moves, token }
}

export function markGameSubmitted(token) {
  localStorage.setItem(SUBMITTED_GAME_TOKEN_KEY, token)
}

export function isGameSubmitted(token) {
  return localStorage.getItem(SUBMITTED_GAME_TOKEN_KEY) === token
}

const normalizeMediaPath = (value) => {
  const rawValue = String(value || '').trim()
  if (!rawValue) {
    return DEFAULT_VIDEO_PATH
  }
  const trimmed = rawValue.replace(/^\/+/, '')
  const segments = trimmed.split('/').filter(Boolean)
  if (segments.some((segment) => segment === '..')) {
    return DEFAULT_VIDEO_PATH
  }
  return segments.join('/')
}

export function getVideoUrl(videoPath = '') {
  const normalizedPath = normalizeMediaPath(videoPath)
  const encodedPath = normalizedPath
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/')
  return `${API_BASE}/media/${encodedPath}`
}
