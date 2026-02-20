import { useCallback, useEffect, useRef, useState } from 'react'
import Fireworks from '../components/Fireworks.jsx'
import {
  fetchGeneralCongratsUrl,
  fetchStats,
  fetchTeamStats,
  fetchTeamTotalStats,
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

function TeamTotalBlock({ entries, loading, error }) {
  const hasEntries = entries && entries.length > 0

  return (
    <div className="stats-board stats-board-team-total">
      <div>
        <h2>Командный зачёт</h2>
        <p className="subtitle">1) Больше игр — выше место. 2) При равенстве — меньше сумма очков лучше.</p>
      </div>
      {loading && <p>Загружаем...</p>}
      {!loading && error && <div className="error">{error}</div>}
      {!loading && !error && !hasEntries && (
        <p className="subtitle">Пока нет результатов.</p>
      )}
      {!loading && !error && hasEntries && (
        <div className="stats-list">
          {entries.map((entry, index) => (
            <div key={`total-${entry.team}`} className="stats-row">
              <div className="stats-main">
                <div className="stats-name">
                  {index === 0 && <span className="crown">👑</span>}
                  <span>{entry.team}</span>
                </div>
                <div className="stats-team team-total-detail">
                  {[
                    entry.memo_best != null && `Мемо: ${entry.memo_best}`,
                    entry.truth_or_myth_best != null && `Правда/миф: ${entry.truth_or_myth_best}`,
                    entry.reaction_best != null && `Реакция: ${entry.reaction_best}`,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </div>
              </div>
              <div className="stats-metrics">
                <span className="team-total-games">Игр: {entry.games_played}</span>
                <span className="team-total-score">Сумма: {entry.total_score}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Victory() {
  const [teamTotalEntries, setTeamTotalEntries] = useState([])
  const [ratingData, setRatingData] = useState(() =>
    RATING_CONFIG.map((c) => ({ gameType: c.gameType, players: [], teams: [] }))
  )
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [generalCongratsUrl, setGeneralCongratsUrl] = useState(null)
  const [showCongratsFullscreen, setShowCongratsFullscreen] = useState(false)
  const congratsOverlayRef = useRef(null)

  useEffect(() => {
    fetchGeneralCongratsUrl().then(setGeneralCongratsUrl)
  }, [])

  useEffect(() => {
    if (!showCongratsFullscreen || !congratsOverlayRef.current) return
    const el = congratsOverlayRef.current
    const onFullscreenChange = () => {
      if (!document.fullscreenElement) setShowCongratsFullscreen(false)
    }
    document.addEventListener('fullscreenchange', onFullscreenChange)
    el.requestFullscreen?.().catch(() => {})
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange)
  }, [showCongratsFullscreen])

  const openCongratsFullscreen = useCallback(() => {
    setShowCongratsFullscreen(true)
  }, [])

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

        const [teamTotalResponse, ...results] = await Promise.all([
          fetchTeamTotalStats(),
          ...RATING_CONFIG.map(async (config) => {
            const [playersResponse, teamsResponse] = await Promise.all([
              fetchStats(config.gameType),
              fetchTeamStats(config.gameType),
            ])
            return {
              gameType: config.gameType,
              players: playersResponse.entries || [],
              teams: teamsResponse.entries || [],
            }
          }),
        ])

        if (isMounted) {
          setTeamTotalEntries(teamTotalResponse.entries || [])
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
    <div className="page page-victory">
      <Fireworks />
      <div className="card-panel wide victory-content">
        <header className="victory-hero">
          <h1 className="victory-title">Поздравляем!</h1>
          <p className="victory-subtitle">Вы прошли игру. Наслаждайтесь.</p>
          <div className="video-wrapper victory-team-video">
            <video src={getVideoUrl(getSelectedTeam())} controls autoPlay />
          </div>
        </header>

        <section className="victory-stats" aria-label="Результаты">
          <TeamTotalBlock
            entries={teamTotalEntries}
            loading={loading}
            error={error}
          />
          <h2 className="victory-stats-heading">Результаты по играм</h2>
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
        </section>

        <div className="victory-cta-wrap">
          {generalCongratsUrl ? (
            <button
              type="button"
              className="congrats-play-btn"
              onClick={openCongratsFullscreen}
            >
              Смотреть поздравление
            </button>
          ) : (
            <p className="victory-loading">Загрузка…</p>
          )}
        </div>
        {showCongratsFullscreen && generalCongratsUrl && (
          <div
            ref={congratsOverlayRef}
            className="congrats-fullscreen-overlay"
            aria-hidden="true"
          >
            <video
              src={generalCongratsUrl}
              controls
              autoPlay
              onEnded={() => document.exitFullscreen?.()}
            />
          </div>
        )}
      </div>
    </div>
  )
}
