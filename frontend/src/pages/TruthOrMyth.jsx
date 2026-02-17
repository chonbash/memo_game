import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchTruthOrMythQuestions, getRegistrationId, submitGameResult } from '../api.js'
import GameCompleteScreen from '../components/GameCompleteScreen.jsx'

const QUESTIONS_COUNT = 6

export default function TruthOrMyth({ onComplete, isLastGame }) {
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

  const wrongCount = useMemo(
    () => Math.max(totalQuestions - correctCount, 0),
    [correctCount, totalQuestions],
  )

  useEffect(() => {
    if (!isComplete || savedResultRef.current) return
    savedResultRef.current = true
    const regId = getRegistrationId()
    if (regId) {
      submitGameResult({
        registration_id: regId,
        game_type: 'truth_or_myth',
        moves: wrongCount,
      }).catch(() => {
        savedResultRef.current = false
      })
    }
  }, [isComplete, wrongCount])

  const handleAnswer = (value) => {
    if (!currentQuestion) return
    const isCorrect = currentQuestion.is_true === value
    if (isCorrect) {
      setCorrectCount((prev) => prev + 1)
    }
    setCurrentIndex((prev) => prev + 1)
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
            <GameCompleteScreen
              title="Результат"
              subtitle={`Правильных ответов: ${correctCount} из ${totalQuestions}`}
              buttonText={isLastGame ? 'Перейти к итогам' : 'К следующему испытанию'}
              onNext={finish}
            />
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
