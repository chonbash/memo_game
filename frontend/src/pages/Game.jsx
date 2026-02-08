import { useState } from 'react'
import MemoGame from './MemoGame.jsx'
import TruthOrMyth from './TruthOrMyth.jsx'

const pickRandomGame = () => (Math.random() < 0.5 ? 'memo' : 'truth-or-myth')

export default function Game() {
  const [gameType] = useState(() => pickRandomGame())

  return gameType === 'memo' ? <MemoGame /> : <TruthOrMyth />
}
