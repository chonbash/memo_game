import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  fetchStats,
  fetchTeamStats,
  getLastGame,
  getRegistrationId,
  getSelectedTeam,
  getVideoUrl,
  isGameSubmitted,
  markGameSubmitted,
  submitGameResult,
} from '../api.js'

export default function Victory() {
  const [stats, setStats] = useState([])
  const [teamStats, setTeamStats] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let isMounted = true

    const load = async () => {
      try {
        setLoading(true)
        setError('')
        const registrationId = getRegistrationId()
        const { moves, token } = getLastGame()

        if (registrationId && moves && token && !isGameSubmitted(token)) {
          await submitGameResult({
            registration_id: registrationId,
            moves,
          })
          markGameSubmitted(token)
        }

        const [playersResponse, teamsResponse] = await Promise.all([
          fetchStats(),
          fetchTeamStats(),
        ])
        if (isMounted) {
          setStats(playersResponse.entries || [])
          setTeamStats(teamsResponse.entries || [])
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Ошибка загрузки статистики')
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    load()

    return () => {
      isMounted = false
    }
  }, [])

  return (
    <div className="page">
      <div className="card-panel wide">
        <h1>Поздравляем!</h1>
        <p className="subtitle">Вы прошли игру. Наслаждайтесь видео.</p>
        <div className="video-wrapper">
          <video src={getVideoUrl(getSelectedTeam())} controls autoPlay />
        </div>
        <div className="stats-board">
          <div>
            <h2>Рейтинг игроков</h2>
            <p className="subtitle">Меньше ходов — выше место</p>
          </div>
          {loading && <p>Загружаем статистику...</p>}
          {!loading && error && <div className="error">{error}</div>}
          {!loading && !error && stats.length === 0 && (
            <p className="subtitle">Пока нет результатов.</p>
          )}
          {!loading && !error && stats.length > 0 && (
            <div className="stats-list">
              {stats.map((entry, index) => (
                <div key={entry.registration_id} className="stats-row">
                  <div className="stats-main">
                    <div className="stats-name">
                      {index === 0 && <span className="crown">👑</span>}
                      <span>{entry.fio}</span>
                    </div>
                    <div className="stats-team">{entry.team}</div>
                  </div>
                  <div className="stats-metrics">
                    <span>Лучший результат: {entry.best_moves} ходов</span>
                    <span>Игры: {entry.games_count}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="stats-board">
          <div>
            <h2>Рейтинг команд</h2>
            <p className="subtitle">Меньше ходов — выше место</p>
          </div>
          {loading && <p>Загружаем статистику...</p>}
          {!loading && error && <div className="error">{error}</div>}
          {!loading && !error && teamStats.length === 0 && (
            <p className="subtitle">Пока нет результатов.</p>
          )}
          {!loading && !error && teamStats.length > 0 && (
            <div className="stats-list">
              {teamStats.map((entry, index) => (
                <div key={entry.team} className="stats-row">
                  <div className="stats-main">
                    <div className="stats-name">
                      {index === 0 && <span className="crown">👑</span>}
                      <span>{entry.team}</span>
                    </div>
                    <div className="stats-team">
                      Лучший результат: {entry.best_moves} ходов
                    </div>
                  </div>
                  <div className="stats-metrics">
                    <span>Игры: {entry.games_count}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <Link className="link-button" to="/">
          Вернуться к регистрации
        </Link>
      </div>
    </div>
  )
}
