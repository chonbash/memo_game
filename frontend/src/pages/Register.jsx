import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  fetchTeams,
  registerUser,
  saveRegistrationId,
  saveSelectedTeam,
} from '../api.js'

const initialForm = {
  fio: '',
  team: '',
}

export default function Register() {
  const [form, setForm] = useState(initialForm)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [teams, setTeams] = useState([])
  const [teamsLoading, setTeamsLoading] = useState(true)
  const [teamsError, setTeamsError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    let isMounted = true

    const loadTeams = async () => {
      try {
        setTeamsLoading(true)
        setTeamsError('')
        const response = await fetchTeams()
        if (isMounted) {
          setTeams(response.entries || [])
        }
      } catch (err) {
        if (isMounted) {
          setTeamsError(err.message || 'Ошибка загрузки команд')
        }
      } finally {
        if (isMounted) {
          setTeamsLoading(false)
        }
      }
    }

    loadTeams()

    return () => {
      isMounted = false
    }
  }, [])

  const onChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const validate = () => {
    if (!form.fio.trim() || !form.team.trim()) {
      return 'Заполните все поля'
    }
    return ''
  }

  const onSubmit = async (event) => {
    event.preventDefault()
    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }

    const trimmedTeam = form.team.trim()
    const selectedTeam = teams.find((team) => team.team === trimmedTeam)
    const mediaPath = selectedTeam?.media_path || ''

    try {
      setLoading(true)
      setError('')
      const registration = await registerUser({
        fio: form.fio.trim(),
        team: trimmedTeam,
      })
      saveRegistrationId(registration.id)
      saveSelectedTeam(mediaPath)
      navigate('/game')
    } catch (err) {
      setError(err.message || 'Ошибка регистрации')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page">
      <div className="card-panel">
        <h1>Игровая регистрация</h1>
        <p className="subtitle">
          Заполните регистрацию и получите случайную игру: Memo или «Правда или
          миф».
        </p>
        <form className="form" onSubmit={onSubmit}>
          <label className="field">
            <span>ФИО</span>
            <input
              name="fio"
              value={form.fio}
              onChange={onChange}
              placeholder="Иванов Иван Иванович"
            />
          </label>
          <label className="field">
            <span>Команда</span>
            <select
              name="team"
              value={form.team}
              onChange={onChange}
              disabled={teamsLoading || teams.length === 0}
            >
              <option value="" disabled>
                {teamsLoading ? 'Загружаем команды...' : 'Выберите команду'}
              </option>
              {teams.map((team) => (
                <option key={team.team} value={team.team}>
                  {team.team}
                </option>
              ))}
            </select>
          </label>
          {teamsError && <div className="error">{teamsError}</div>}
          {error && <div className="error">{error}</div>}
          <button
            type="submit"
            disabled={loading || teamsLoading || teams.length === 0}
          >
            {loading ? 'Отправляем...' : 'Начать игру'}
          </button>
        </form>
      </div>
    </div>
  )
}
