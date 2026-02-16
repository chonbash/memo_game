import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getRegistrationId, submitGameResult } from '../api.js'
import GameCompleteScreen from '../components/GameCompleteScreen.jsx'

const symbols = ['🍀', '⭐', '🎯', '🎵', '🚀', '💎', '🎈', '🧩']

const buildDeck = () => {
  const pairs = symbols.flatMap((symbol) => [
    { id: `${symbol}-a`, symbol, matched: false },
    { id: `${symbol}-b`, symbol, matched: false },
  ])

  for (let i = pairs.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[pairs[i], pairs[j]] = [pairs[j], pairs[i]]
  }

  return pairs
}

const formatTime = (seconds) => {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function MemoGame({ onComplete }) {
  const [cards, setCards] = useState(() => buildDeck())
  const [flipped, setFlipped] = useState([])
  const [moves, setMoves] = useState(0)
  const [showResult, setShowResult] = useState(false)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const navigate = useNavigate()
  const savedResultRef = useRef(false)
  const startTimeRef = useRef(Date.now())

  const allMatched = useMemo(
    () => cards.length > 0 && cards.every((card) => card.matched),
    [cards],
  )

  useEffect(() => {
    if (!showResult) return
    const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000)
    setElapsedSeconds(elapsed)
  }, [showResult])

  useEffect(() => {
    if (!allMatched) return

    if (!savedResultRef.current) {
      savedResultRef.current = true
      const regId = getRegistrationId()
      if (regId) {
        submitGameResult({ registration_id: regId, game_type: 'memo', moves }).catch(
          () => { savedResultRef.current = false }
        )
      }
    }

    setShowResult(true)
  }, [allMatched, moves])

  const goToNext = () => {
    if (onComplete) {
      onComplete()
    } else {
      navigate('/victory')
    }
  }

  useEffect(() => {
    if (flipped.length !== 2) return

    const [firstId, secondId] = flipped
    const first = cards.find((card) => card.id === firstId)
    const second = cards.find((card) => card.id === secondId)

    if (!first || !second) return

    if (first.symbol === second.symbol) {
      setCards((prev) =>
        prev.map((card) =>
          card.symbol === first.symbol ? { ...card, matched: true } : card,
        ),
      )
      setFlipped([])
      return
    }

    const timeout = setTimeout(() => setFlipped([]), 700)
    return () => clearTimeout(timeout)
  }, [cards, flipped])

  const onCardClick = (id) => {
    if (flipped.length === 2) return

    const card = cards.find((item) => item.id === id)
    if (!card || card.matched) return
    if (flipped.includes(id)) return

    setFlipped((prev) => [...prev, id])
    setMoves((prev) => prev + 1)
  }

  if (showResult) {
    return (
      <div className="page">
        <div className="card-panel wide memo-result-panel">
          <GameCompleteScreen
            title="Мемо пройдено!"
            subtitle="Все пары найдены"
            stats={
              <div className="memo-result-stats">
                <div className="memo-result-stat">
                  <span className="memo-result-value">{moves}</span>
                  <span className="memo-result-label">ходов</span>
                </div>
                <div className="memo-result-stat">
                  <span className="memo-result-value">{formatTime(elapsedSeconds)}</span>
                  <span className="memo-result-label">время</span>
                </div>
              </div>
            }
            buttonText="Следующая игра →"
            onNext={goToNext}
            titleTag="h1"
            buttonClassName="primary-button"
            buttonWrapperClassName=""
          />
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="card-panel wide">
        <div className="game-header">
          <div>
            <h1>Игра Memo</h1>
            <p className="subtitle">Найдите все пары</p>
          </div>
          <div className="stats">
            <span>Ходы: {moves}</span>
          </div>
        </div>

        <div className="grid">
          {cards.map((card) => {
            const isOpen = card.matched || flipped.includes(card.id)
            return (
              <button
                key={card.id}
                type="button"
                className={`memo-card ${isOpen ? 'open' : ''}`}
                onClick={() => onCardClick(card.id)}
                aria-label="Открыть карточку"
              >
                <span>{isOpen ? card.symbol : '❓'}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
