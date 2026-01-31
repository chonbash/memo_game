const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000'
const TEAM_STORAGE_KEY = 'memoGameTeam'
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

export function saveSelectedTeam(team) {
  localStorage.setItem(TEAM_STORAGE_KEY, team)
}

export function getSelectedTeam() {
  return localStorage.getItem(TEAM_STORAGE_KEY) || ''
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
