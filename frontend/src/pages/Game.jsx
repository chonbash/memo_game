import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import MemoGame from './MemoGame.jsx'
import TruthOrMyth from './TruthOrMyth.jsx'

const buildGameOrder = () =>
  Math.random() < 0.5 ? ['memo', 'truth-or-myth'] : ['truth-or-myth', 'memo']

export default function Game() {
  const [gameOrder] = useState(() => buildGameOrder())
  const [currentIndex, setCurrentIndex] = useState(0)
  const navigate = useNavigate()

  const handleComplete = useCallback(() => {
    const nextIndex = currentIndex + 1
    if (nextIndex >= gameOrder.length) {
      navigate('/victory')
      return
    }
    setCurrentIndex(nextIndex)
  }, [currentIndex, gameOrder.length, navigate])

  const currentGame = gameOrder[currentIndex]

  return currentGame === 'memo' ? (
    <MemoGame onComplete={handleComplete} />
  ) : (
    <TruthOrMyth onComplete={handleComplete} />
  )
}
