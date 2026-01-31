import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { saveLastGame } from '../api.js'

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

export default function Game() {
  const [cards, setCards] = useState(() => buildDeck())
  const [flipped, setFlipped] = useState([])
  const [moves, setMoves] = useState(0)
  const navigate = useNavigate()
  const savedResultRef = useRef(false)

  const allMatched = useMemo(
    () => cards.length > 0 && cards.every((card) => card.matched),
    [cards],
  )

  useEffect(() => {
    if (allMatched) {
      if (!savedResultRef.current) {
        saveLastGame(moves)
        savedResultRef.current = true
      }
      const timer = setTimeout(() => navigate('/victory'), 600)
      return () => clearTimeout(timer)
    }
  }, [allMatched, moves, navigate])

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

  const reset = () => {
    setCards(buildDeck())
    setFlipped([])
    setMoves(0)
    savedResultRef.current = false
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
            <button type="button" className="ghost" onClick={reset}>
              Сбросить
            </button>
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
