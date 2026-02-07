import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { saveLastGame } from '../api.js'
import { truthOrMythQuestions } from '../data/truthOrMythQuestions.js'

const QUESTIONS_COUNT = 6
const BASE_MOVES = 16
const WRONG_PENALTY = 2

const pickRandomQuestions = () => {
  const shuffled = [...truthOrMythQuestions]
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled.slice(0, Math.min(QUESTIONS_COUNT, shuffled.length))
}

const calculateMoves = (correctCount, totalCount) => {
  const incorrect = Math.max(totalCount - correctCount, 0)
  return BASE_MOVES + incorrect * WRONG_PENALTY
}

export default function TruthOrMyth() {
  const [questions, setQuestions] = useState(() => pickRandomQuestions())
  const [currentIndex, setCurrentIndex] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const navigate = useNavigate()
  const savedResultRef = useRef(false)

  const totalQuestions = questions.length
  const answeredCount = Math.min(currentIndex, totalQuestions)
  const isComplete = totalQuestions > 0 && currentIndex >= totalQuestions
  const currentQuestion = !isComplete ? questions[currentIndex] : null

  const moves = useMemo(
    () => calculateMoves(correctCount, totalQuestions),
    [correctCount, totalQuestions],
  )

  useEffect(() => {
    if (!isComplete || savedResultRef.current) return
    saveLastGame(moves)
    savedResultRef.current = true
  }, [isComplete, moves])

  const handleAnswer = (value) => {
    if (!currentQuestion) return
    const isCorrect = currentQuestion.isTrue === value
    if (isCorrect) {
      setCorrectCount((prev) => prev + 1)
    }
    setCurrentIndex((prev) => prev + 1)
  }

  const reset = () => {
    setQuestions(pickRandomQuestions())
    setCurrentIndex(0)
    setCorrectCount(0)
    savedResultRef.current = false
  }

  const finish = () => navigate('/victory')

  return (
    <div className="page">
      <div className="card-panel wide">
        <div className="game-header">
          <div>
            <h1>Правда или миф</h1>
            <p className="subtitle">Ответьте на {totalQuestions} вопросов</p>
          </div>
          {!isComplete && (
            <div className="stats">
              <span>
                Вопрос {Math.min(currentIndex + 1, totalQuestions)} из{' '}
                {totalQuestions}
              </span>
              <span>Правильные: {correctCount}</span>
              <button type="button" className="ghost" onClick={reset}>
                Сбросить
              </button>
            </div>
          )}
        </div>

        {totalQuestions === 0 && (
          <p className="subtitle">Вопросы пока не доступны.</p>
        )}

        {totalQuestions > 0 && isComplete && (
          <div className="truth-result">
            <h2>Результат</h2>
            <p className="subtitle">
              Правильных ответов: {correctCount} из {totalQuestions}
            </p>
            <div className="truth-actions">
              <button type="button" onClick={finish}>
                Перейти к итогам
              </button>
              <button type="button" className="ghost" onClick={reset}>
                Сыграть еще раз
              </button>
            </div>
          </div>
        )}

        {totalQuestions > 0 && !isComplete && currentQuestion && (
          <>
            <div className="truth-card">
              <p className="truth-question">{currentQuestion.statement}</p>
            </div>
            <div className="truth-actions">
              <button
                type="button"
                className="truth-button truth"
                onClick={() => handleAnswer(true)}
              >
                Правда
              </button>
              <button
                type="button"
                className="truth-button myth"
                onClick={() => handleAnswer(false)}
              >
                Миф
              </button>
            </div>
            <div className="truth-meta">
              <span>
                Отвечено: {answeredCount} из {totalQuestions}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
