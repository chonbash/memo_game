import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import MemoGame from './MemoGame.jsx'
import TruthOrMyth from './TruthOrMyth.jsx'
import ReactionGame from './ReactionGame.jsx'
import { fetchPlayedGames, getRegistrationId } from '../api.js'

const GAMES = ['memo', 'truth-or-myth', 'reaction']
const SLUG_TO_TYPE = { memo: 'memo', 'truth-or-myth': 'truth_or_myth', reaction: 'reaction' }

const buildGameOrder = () => {
  const order = [...GAMES]
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[order[i], order[j]] = [order[j], order[i]]
  }
  return order
}

export default function Game() {
  const [gameOrder] = useState(() => buildGameOrder())
  const [playedGames, setPlayedGames] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const regId = getRegistrationId()
    if (!regId) {
      setLoading(false)
      return
    }
    fetchPlayedGames(regId)
      .then(setPlayedGames)
      .catch(() => setPlayedGames([]))
      .finally(() => setLoading(false))
  }, [])

  const availableGames = gameOrder.filter(
    (slug) => !playedGames.includes(SLUG_TO_TYPE[slug])
  )

  useEffect(() => {
    if (loading) return
    if (availableGames.length === 0) {
      navigate('/victory')
    }
  }, [loading, availableGames.length, navigate])

  const handleComplete = useCallback(() => {
    const nextGame = availableGames[0]
    const completedType = nextGame ? SLUG_TO_TYPE[nextGame] : null
    const next = [...playedGames, completedType]
    const remaining = gameOrder.filter((s) => !next.includes(SLUG_TO_TYPE[s]))
    setPlayedGames(next)
    if (remaining.length === 0) {
      navigate('/victory')
    }
  }, [availableGames, playedGames, gameOrder, navigate])

  const currentGame = availableGames[0]
  const isLastGame = availableGames.length === 1

  if (loading || availableGames.length === 0) {
    return (
      <div className="page">
        <div className="card-panel wide">
          <p className="subtitle">{loading ? 'Загрузка...' : 'Перенаправление...'}</p>
        </div>
      </div>
    )
  }

  if (currentGame === 'memo') return <MemoGame onComplete={handleComplete} isLastGame={isLastGame} />
  if (currentGame === 'truth-or-myth')
    return <TruthOrMyth onComplete={handleComplete} isLastGame={isLastGame} />
  return <ReactionGame onComplete={handleComplete} isLastGame={isLastGame} />
}
