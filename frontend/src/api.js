const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000'
const TEAM_VIDEO_PATH_KEY = 'memoGameTeam'
export const API_BASE =
  import.meta.env.VITE_API_BASE || 'http://localhost:8000'
const TEAM_STORAGE_KEY = 'memoGameTeam'
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
    const message = await response.text()
    throw new Error(message || 'Ошибка сохранения результата')
  }

  return response.json()
}

export async function fetchStats() {
  const response = await fetch(`${API_BASE}/api/stats`)
  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || 'Ошибка загрузки статистики')
  }
  return response.json()
}

export async function fetchTeamStats() {
  const response = await fetch(`${API_BASE}/api/team-stats`)
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
export async function fetchAdminVideos() {
  const response = await fetch(`${API_BASE}/api/admin/videos`)
  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || 'Ошибка загрузки видео')
  }
  return response.json()
}

export function saveSelectedTeam(videoPath) {
  localStorage.setItem(TEAM_VIDEO_PATH_KEY, videoPath)
export async function uploadAdminVideo(teamKey, file) {
  const formData = new FormData()
  formData.append('file', file)
  const encodedKey = encodeURIComponent(teamKey)
  const response = await fetch(`${API_BASE}/api/admin/videos/${encodedKey}`, {
    method: 'POST',
    body: formData,
  })
  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || 'Ошибка загрузки видео')
  }
  return response.json()
}

export async function fetchAdminQuestions() {
  const response = await fetch(`${API_BASE}/api/admin/questions`)
  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || 'Ошибка загрузки вопросов')
  }
  return response.json()
}

export async function createAdminQuestion(payload) {
  const response = await fetch(`${API_BASE}/api/admin/questions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
      headers: { 'Content-Type': 'application/json' },
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
    },
  )
  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || 'Ошибка удаления вопроса')
  }
  return response.json()
}

export function saveSelectedTeam(team) {
  localStorage.setItem(TEAM_STORAGE_KEY, team)
}

export function getSelectedTeam() {
  const storedTeam = localStorage.getItem(TEAM_VIDEO_PATH_KEY) || ''
  // #region agent log
  fetch('http://127.0.0.1:7247/ingest/4466ca90-6875-42e7-b2f1-f4c1f0127932',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'A',location:'frontend/src/api.js:getSelectedTeam',message:'Selected team from storage',data:{storedTeam},timestamp:Date.now()})}).catch(()=>{});
  // #endregion
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
  // #region agent log
  fetch('http://127.0.0.1:7247/ingest/4466ca90-6875-42e7-b2f1-f4c1f0127932',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'B',location:'frontend/src/api.js:getVideoUrl',message:'Compute video URL',data:{videoPath, normalizedPath, encodedPath, apiBase: API_BASE},timestamp:Date.now()})}).catch(()=>{});
  // #endregion
  return `${API_BASE}/media/${encodedPath}`
}
