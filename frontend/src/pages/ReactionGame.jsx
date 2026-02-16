import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getRegistrationId, submitGameResult } from '../api.js'
import GameCompleteScreen from '../components/GameCompleteScreen.jsx'

const LIVES = 3
const GREEN_GOAL = 10
const MAX_CIRCLES = 8
const MARGIN = 5
const MIN_SIZE = 44
const MAX_SIZE = 48
const SPAWN_DELAY_MIN = 100
const SPAWN_DELAY_MAX = 1000
const LEVEL_INTERVAL_MS = 3000
const BASE_GROWTH_MS = 1200
const LEVEL_GROWTH_DELTA_MS = 300

const GAME_AREA_WIDTH = 600
const GAME_AREA_HEIGHT = 400

const COLORS = {
  green: '#22c55e',
  red: '#ef4444',
  gray: '#9ca3af',
}

const pickColor = () => {
  const r = Math.random()
  if (r < 0.1) return 'red'
  if (r < 0.7) return 'gray'
  return 'green'
}

const randomSpawnDelay = () =>
  SPAWN_DELAY_MIN + Math.random() * (SPAWN_DELAY_MAX - SPAWN_DELAY_MIN)

const randomPosition = () => {
  const size = MIN_SIZE + Math.random() * (MAX_SIZE - MIN_SIZE + 1)
  const half = size / 2
  const minX = MARGIN + half
  const maxX = GAME_AREA_WIDTH - MARGIN - half
  const minY = MARGIN + half
  const maxY = GAME_AREA_HEIGHT - MARGIN - half
  const x = minX + Math.random() * Math.max(0, maxX - minX)
  const y = minY + Math.random() * Math.max(0, maxY - minY)
  return { x, y, maxSize: Math.round(size) }
}

export default function ReactionGame({ onComplete }) {
  const [lives, setLives] = useState(LIVES)
  const [greenCount, setGreenCount] = useState(0)
  const [circles, setCircles] = useState([])
  const [level, setLevel] = useState(0)
  const [gameOver, setGameOver] = useState(null) // 'win' | 'lose' | null
  const [winLevel, setWinLevel] = useState(null)
  const resultSubmittedRef = useRef(false)
  const nextSpawnRef = useRef(null)
  const levelIntervalRef = useRef(null)
  const circlesGrowthRef = useRef(new Map())
  const circleIdRef = useRef(0)
  const growthDurationRef = useRef(BASE_GROWTH_MS)
  const navigate = useNavigate()

  const growthDuration = useMemo(
    () => BASE_GROWTH_MS + level * LEVEL_GROWTH_DELTA_MS,
    [level],
  )
  growthDurationRef.current = growthDuration

  useEffect(() => {
    levelIntervalRef.current = setInterval(() => {
      setLevel((prev) => prev + 1)
    }, LEVEL_INTERVAL_MS)
    return () => {
      if (levelIntervalRef.current) clearInterval(levelIntervalRef.current)
    }
  }, [])

  const scheduleSpawn = useCallback(() => {
    if (gameOver) return
    const delay = randomSpawnDelay()
    nextSpawnRef.current = setTimeout(() => {
      setCircles((prev) => {
        if (prev.length >= MAX_CIRCLES) return prev
        const dur = growthDurationRef.current
        const { x, y, maxSize } = randomPosition()
        const id = ++circleIdRef.current
        const color = pickColor()
        const spawnTime = Date.now()
        const circle = {
          id,
          color,
          x,
          y,
          size: 1,
          maxSize,
          spawnTime,
          growthDuration: dur,
        }
        circlesGrowthRef.current.set(id, { spawnTime, growthDuration: dur })
        return [...prev, circle]
      })
      scheduleSpawn()
    }, delay)
  }, [gameOver])

  useEffect(() => {
    scheduleSpawn()
    return () => {
      if (nextSpawnRef.current) clearTimeout(nextSpawnRef.current)
    }
  }, [scheduleSpawn])

  useEffect(() => {
    if (gameOver) return
    const tick = () => {
      const now = Date.now()
      setCircles((prev) => {
        const next = prev
          .map((c) => {
            const meta = circlesGrowthRef.current.get(c.id)
            const dur = meta?.growthDuration ?? c.growthDuration
            const elapsed = now - c.spawnTime
            const progress = Math.min(1, elapsed / dur)
            const size = 1 + (c.maxSize - 1) * progress
            if (progress >= 1) {
              circlesGrowthRef.current.delete(c.id)
              return null
            }
            return { ...c, size }
          })
          .filter(Boolean)
        return next
      })
    }
    const id = setInterval(tick, 16)
    return () => clearInterval(id)
  }, [gameOver])

  useEffect(() => {
    if (greenCount >= GREEN_GOAL && !gameOver) {
      setGameOver('win')
      setWinLevel(level)
    }
  }, [greenCount, gameOver, level])

  useEffect(() => {
    if (lives <= 0 && !gameOver) {
      setGameOver('lose')
    }
  }, [lives, gameOver])

  useEffect(() => {
    if (!gameOver || resultSubmittedRef.current) return
    const regId = getRegistrationId()
    if (!regId) return
    const score = gameOver === 'win' ? winLevel : level
    resultSubmittedRef.current = true
    submitGameResult({
      registration_id: regId,
      game_type: 'reaction',
      moves: score,
    }).catch(() => {
      resultSubmittedRef.current = false
    })
  }, [gameOver, winLevel, level])

  const handleCircleClick = useCallback(
    (id) => {
      if (gameOver) return
      const circle = circles.find((c) => c.id === id)
      if (!circle) return

      setCircles((prev) => prev.filter((c) => c.id !== id))
      circlesGrowthRef.current.delete(id)

      if (circle.color === 'green') {
        setGreenCount((prev) => prev + 1)
      } else if (circle.color === 'red') {
        setLives((prev) => Math.max(0, prev - 1))
      }
    },
    [gameOver, circles],
  )

  const finish = useCallback(() => {
    const regId = getRegistrationId()
    if (regId) {
      const moves = gameOver === 'win' ? Math.max(1, 100 - (winLevel ?? 0)) : 999
      submitGameResult({ registration_id: regId, game_type: 'reaction', moves }).catch(
        () => {}
      )
    }
    if (onComplete) {
      onComplete()
    } else {
      navigate('/victory')
    }
  }, [onComplete, navigate, gameOver, winLevel])

  const sortedCircles = useMemo(
    () => [...circles].sort((a, b) => a.spawnTime - b.spawnTime),
    [circles],
  )

  const wrapRef = useRef(null)
  const [scale, setScale] = useState(1)
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const update = () => {
      const w = el.offsetWidth
      const h = el.offsetHeight
      if (w <= 0 || h <= 0) return
      const s = Math.min(1, w / GAME_AREA_WIDTH, h / GAME_AREA_HEIGHT)
      setScale(s)
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    <div className="page">
      <div className="card-panel wide">
        <div className="game-header">
          <div>
            <h1>Игра на реакцию</h1>
            <p className="subtitle">
              Кликайте по зелёным кружкам. Избегайте красных!
            </p>
          </div>
          {!gameOver && (
            <div className="stats">
              <span>❤️ {lives}</span>
              <span>🟢 {greenCount}/{GREEN_GOAL}</span>
              <span>Уровень {level}</span>
            </div>
          )}
        </div>

        {!gameOver && (
          <div ref={wrapRef} className="reaction-wrap">
            <div
              className="reaction-area"
              style={{
                width: GAME_AREA_WIDTH,
                height: GAME_AREA_HEIGHT,
                transform: `scale(${scale})`,
              }}
            >
            {sortedCircles.map((c) => (
              <button
                key={c.id}
                type="button"
                className="reaction-circle"
                style={{
                  left: c.x - c.size / 2,
                  top: c.y - c.size / 2,
                  width: c.size,
                  height: c.size,
                  background: COLORS[c.color],
                  borderRadius: '50%',
                }}
                onClick={() => handleCircleClick(c.id)}
                aria-label={`Круг ${c.color}`}
              />
            ))}
            </div>
          </div>
        )}

        {gameOver === 'win' && (
          <div className="truth-result">
            <GameCompleteScreen
              title="Победа!"
              subtitle={`Вы собрали все 10 зелёных кружков на уровне ${winLevel}`}
              buttonText="Далее"
              onNext={finish}
            />
          </div>
        )}

        {gameOver === 'lose' && (
          <div className="truth-result">
            <GameCompleteScreen
              title="Поражение"
              subtitle="Жизни закончились"
              buttonText="Пропустить"
              onNext={finish}
            />
          </div>
        )}
      </div>
    </div>
  )
}
