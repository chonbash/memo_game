const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000'
const TEAM_STORAGE_KEY = 'memoGameTeam'
const REGISTRATION_ID_KEY = 'memoGameRegistrationId'
const LAST_GAME_MOVES_KEY = 'memoGameLastMoves'
const LAST_GAME_TOKEN_KEY = 'memoGameLastGameToken'
const SUBMITTED_GAME_TOKEN_KEY = 'memoGameSubmittedGameToken'
const TEAM_VIDEO_BASENAME = 'congrats'

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

export function saveSelectedTeam(team) {
  localStorage.setItem(TEAM_STORAGE_KEY, team)
}

export function getSelectedTeam() {
  return localStorage.getItem(TEAM_STORAGE_KEY) || ''
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

export function getVideoUrl(team = '', extension = 'mp4') {
  const sanitizedTeam = team.trim()
  const safeExtension = extension.toLowerCase()
  const filename = `${TEAM_VIDEO_BASENAME}.${safeExtension}`
  if (!sanitizedTeam) {
    return `${API_BASE}/media/${filename}`
  }
  return `${API_BASE}/media/${encodeURIComponent(sanitizedTeam)}/${filename}`
}
