import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchTruthOrMythQuestions, saveLastGame } from '../api.js'

const QUESTIONS_COUNT = 6
const BASE_MOVES = 16
const WRONG_PENALTY = 2

const calculateMoves = (correctCount, totalCount) => {
  const incorrect = Math.max(totalCount - correctCount, 0)
  return BASE_MOVES + incorrect * WRONG_PENALTY
}

export default function TruthOrMyth({ onComplete }) {
  const [questions, setQuestions] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const savedResultRef = useRef(false)

  const loadQuestions = useCallback(async () => {
    setLoading(true)
    setError('')
    setQuestions([])
    setCurrentIndex(0)
    setCorrectCount(0)
    savedResultRef.current = false
    try {
      const response = await fetchTruthOrMythQuestions(QUESTIONS_COUNT)
      setQuestions(response.entries || [])
    } catch (err) {
      setError(err.message || 'Ошибка загрузки вопросов')
    } finally {
      setLoading(false)
    }
  }, [fetchTruthOrMythQuestions, QUESTIONS_COUNT])

  useEffect(() => {
    loadQuestions()
  }, [loadQuestions])

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
    const isCorrect = currentQuestion.is_true === value
    if (isCorrect) {
      setCorrectCount((prev) => prev + 1)
    }
    setCurrentIndex((prev) => prev + 1)
  }

  const reset = () => {
    loadQuestions()
  }

  const finish = () => {
    if (onComplete) {
      onComplete()
      return
    }
    navigate('/victory')
  }

  return (
    <div className="page">
      <div className="card-panel wide">
        <div className="game-header">
          <div>
            <h1>Правда или миф</h1>
            <p className="subtitle">Ответьте на {totalQuestions} вопросов</p>
          </div>
          {!loading && !error && !isComplete && totalQuestions > 0 && (
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

        {loading && <p className="subtitle">Загружаем вопросы...</p>}

        {!loading && error && (
          <div>
            <div className="error">{error}</div>
            <button type="button" className="ghost" onClick={loadQuestions}>
              Повторить загрузку
            </button>
          </div>
        )}

        {!loading && !error && totalQuestions === 0 && (
          <p className="subtitle">Вопросы пока не доступны.</p>
        )}

        {!loading && !error && totalQuestions > 0 && isComplete && (
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

        {!loading && !error && totalQuestions > 0 && !isComplete && currentQuestion && (
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
