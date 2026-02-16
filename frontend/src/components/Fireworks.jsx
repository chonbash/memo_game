import { useEffect, useRef, useState } from 'react'

const COLORS = [
  '#ff3366', '#ff6b35', '#ffd93d', '#6bcb77', '#4d96ff',
  '#9b59b6', '#00d9ff', '#ff4757', '#ffa502', '#2ed573',
]

function random(min, max) {
  return Math.random() * (max - min) + min
}

function createConfetti(w, h) {
  const isRect = Math.random() > 0.4
  const angle = random(-0.6, 0.6)
  const speed = random(8, 18)
  const vx = Math.sin(angle) * speed * random(0.5, 1.2)
  const vy = -Math.cos(angle) * speed * random(0.8, 1.2)
  return {
    x: w,
    y: h,
    vx,
    vy,
    rotation: random(0, Math.PI * 2),
    rotationSpeed: random(-0.15, 0.15),
    color: COLORS[Math.floor(random(0, COLORS.length))],
    life: 1,
    decay: random(0.006, 0.012),
    width: isRect ? random(6, 12) : random(5, 9),
    height: isRect ? random(4, 8) : random(5, 9),
    shape: isRect ? 'rect' : 'circle',
  }
}

export default function Fireworks() {
  const canvasRef = useRef(null)
  const [visible, setVisible] = useState(true)
  const [fadeOut, setFadeOut] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    let animationId
    let confetti = []
    const startTime = performance.now()
    const duration = 5000
    const fadeDuration = 400

    const resize = () => {
      const dpr = window.devicePixelRatio || 1
      const w = window.innerWidth
      const h = window.innerHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const spawnBurst = (w, h) => {
      const count = Math.floor(random(55, 85))
      for (let i = 0; i < count; i++) {
        confetti.push(createConfetti(w, h))
      }
    }

    const tick = (now) => {
      const elapsed = now - startTime

      if (elapsed >= duration) {
        setFadeOut(true)
        setTimeout(() => setVisible(false), fadeDuration)
        return
      }

      if (confetti.length === 0) {
        const w = canvas.width / (window.devicePixelRatio || 1)
        const h = canvas.height / (window.devicePixelRatio || 1)
        spawnBurst(w * 0.35, h * 0.85)
        spawnBurst(w * 0.65, h * 0.88)
      }

      const w = canvas.width / (window.devicePixelRatio || 1)
      const h = canvas.height / (window.devicePixelRatio || 1)

      ctx.clearRect(0, 0, w, h)

      confetti = confetti.filter((c) => {
        c.x += c.vx
        c.y += c.vy
        c.vy += 0.22
        c.vx *= 0.998
        c.rotation += c.rotationSpeed
        c.life -= c.decay
        if (c.life <= 0) return false

        ctx.save()
        ctx.translate(c.x, c.y)
        ctx.rotate(c.rotation)
        ctx.globalAlpha = c.life
        ctx.fillStyle = c.color

        if (c.shape === 'rect') {
          ctx.fillRect(-c.width / 2, -c.height / 2, c.width, c.height)
        } else {
          ctx.beginPath()
          ctx.arc(0, 0, c.width / 2, 0, Math.PI * 2)
          ctx.fill()
        }

        ctx.restore()
        return true
      })

      animationId = requestAnimationFrame(tick)
    }

    resize()
    window.addEventListener('resize', resize)
    animationId = requestAnimationFrame(tick)

    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(animationId)
    }
  }, [])

  if (!visible) return null

  return (
    <div
      className="fireworks-layer"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 1000,
        opacity: fadeOut ? 0 : 1,
        transition: `opacity ${0.4}s ease-out`,
      }}
    >
      <canvas
        ref={canvasRef}
        className="fireworks-canvas"
        style={{ display: 'block', width: '100%', height: '100%' }}
      />
    </div>
  )
}
