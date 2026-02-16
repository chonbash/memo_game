import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Fireworks from '../components/Fireworks.jsx'
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

const RATING_CONFIG = [
  {
    gameType: 'memo',
    title: 'Мемо',
    subtitle: 'Меньше ходов — выше место',
    unit: 'ходов',
  },
  {
    gameType: 'reaction',
    title: 'Реакция',
    subtitle: 'Ниже уровень — выше место',
    unit: 'уровень',
  },
  {
    gameType: 'truth_or_myth',
    title: 'Правда или миф',
    subtitle: 'Меньше ошибок — выше место',
    unit: 'ошибок',
  },
]

function RatingBlock({ config, playerEntries, teamEntries, loading, error }) {
  const hasPlayers = playerEntries && playerEntries.length > 0
  const hasTeams = teamEntries && teamEntries.length > 0
  const empty = !hasPlayers && !hasTeams

  return (
    <div className="stats-board">
      <div>
        <h2>Рейтинг: {config.title}</h2>
        <p className="subtitle">{config.subtitle}</p>
      </div>
      {loading && <p>Загружаем...</p>}
      {!loading && error && <div className="error">{error}</div>}
      {!loading && !error && empty && (
        <p className="subtitle">Пока нет результатов.</p>
      )}
      {!loading && !error && hasPlayers && (
        <>
          <h3 className="stats-subheading">Игроки</h3>
          <div className="stats-list">
            {playerEntries.map((entry, index) => (
              <div key={`${config.gameType}-p-${entry.registration_id}`} className="stats-row">
                <div className="stats-main">
                  <div className="stats-name">
                    {index === 0 && <span className="crown">👑</span>}
                    <span>{entry.fio}</span>
                  </div>
                  <div className="stats-team">{entry.team}</div>
                </div>
                <div className="stats-metrics">
                  <span>Лучший результат: {entry.best_moves} {config.unit}</span>
                  <span>Игры: {entry.games_count}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
      {!loading && !error && hasTeams && (
        <>
          <h3 className="stats-subheading">Команды</h3>
          <div className="stats-list">
            {teamEntries.map((entry, index) => (
              <div key={`${config.gameType}-t-${entry.team}`} className="stats-row">
                <div className="stats-main">
                  <div className="stats-name">
                    {index === 0 && <span className="crown">👑</span>}
                    <span>{entry.team}</span>
                  </div>
                  <div className="stats-team">
                    Лучший результат: {entry.best_moves} {config.unit}
                  </div>
                </div>
                <div className="stats-metrics">
                  <span>Игры: {entry.games_count}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default function Victory() {
  const [ratingData, setRatingData] = useState(() =>
    RATING_CONFIG.map((c) => ({ gameType: c.gameType, players: [], teams: [] }))
  )
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

        if (registrationId && moves != null && token && !isGameSubmitted(token)) {
          await submitGameResult({
            registration_id: registrationId,
            game_type: 'memo',
            moves,
          })
          markGameSubmitted(token)
        }

        const results = await Promise.all(
          RATING_CONFIG.map(async (config) => {
            const [playersResponse, teamsResponse] = await Promise.all([
              fetchStats(config.gameType),
              fetchTeamStats(config.gameType),
            ])
            return {
              gameType: config.gameType,
              players: playersResponse.entries || [],
              teams: teamsResponse.entries || [],
            }
          })
        )
        if (isMounted) {
          setRatingData(results)
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
      <Fireworks />
      <div className="card-panel wide victory-content">
        <h1>Поздравляем!</h1>
        <p className="subtitle">Вы прошли игру. Наслаждайтесь видео.</p>
        <div className="video-wrapper">
          <video src={getVideoUrl(getSelectedTeam())} controls autoPlay />
        </div>
        {RATING_CONFIG.map((config, i) => (
          <RatingBlock
            key={config.gameType}
            config={config}
            playerEntries={ratingData[i]?.players ?? []}
            teamEntries={ratingData[i]?.teams ?? []}
            loading={loading}
            error={error}
          />
        ))}
        <Link className="link-button" to="/">
          Вернуться к регистрации
        </Link>
      </div>
    </div>
  )
}
