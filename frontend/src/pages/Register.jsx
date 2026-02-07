import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { registerUser, saveRegistrationId, saveSelectedTeam } from '../api.js'

const teamOptions = [
  'Сопровождение ЕПА',
  'Сопровождение ФОСП',
  'Сопровождение ЕПА КИБ/СМБ',
  'Сопровождение УИП',
  'Сопровождение ОСА',
  'Сопровождение ОСП',
  'Сопровождение ОСКК',
  'Сопровождение ССА',
  'Сопровождение ССП',
  'Сопровождение ССД',
  'Штаб',
  'КУС',
]

const initialForm = {
  fio: '',
  team: '',
}

export default function Register() {
  const [form, setForm] = useState(initialForm)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

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
    const mediaTeam = trimmedTeam.replaceAll('/', '-')

    try {
      setLoading(true)
      setError('')
      const registration = await registerUser({
        fio: form.fio.trim(),
        team: trimmedTeam,
      })
      saveRegistrationId(registration.id)
      saveSelectedTeam(mediaTeam)
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
        <h1>Memo Game</h1>
        <p className="subtitle">Заполните регистрацию и начните игру</p>
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
            <select name="team" value={form.team} onChange={onChange}>
              <option value="" disabled>
                Выберите команду
              </option>
              {teamOptions.map((team) => (
                <option key={team} value={team}>
                  {team}
                </option>
              ))}
            </select>
          </label>
          {error && <div className="error">{error}</div>}
          <button type="submit" disabled={loading}>
            {loading ? 'Отправляем...' : 'Начать игру'}
          </button>
        </form>
        <Link className="link-button subtle" to="/admin">
          Перейти в админку
        </Link>
      </div>
    </div>
  )
}
