import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  API_BASE,
  createAdminQuestion,
  deleteAdminQuestion,
  fetchAdminQuestions,
  fetchAdminVideos,
  updateAdminQuestion,
  uploadAdminVideo,
} from '../api.js'

const DEFAULT_VIDEO_KEY = 'default'

const buildEmptyQuestion = () => ({
  question: '',
  answer: true,
  is_active: true,
})

export default function Admin() {
  const [videos, setVideos] = useState([])
  const [videosLoading, setVideosLoading] = useState(true)
  const [videosError, setVideosError] = useState('')
  const [pendingFiles, setPendingFiles] = useState({})
  const [uploadingKey, setUploadingKey] = useState('')
  const [newTeamName, setNewTeamName] = useState('')
  const [newTeamFile, setNewTeamFile] = useState(null)
  const [newTeamError, setNewTeamError] = useState('')

  const [questions, setQuestions] = useState([])
  const [questionsLoading, setQuestionsLoading] = useState(true)
  const [questionsError, setQuestionsError] = useState('')
  const [questionBusyIds, setQuestionBusyIds] = useState({})
  const [questionActionError, setQuestionActionError] = useState('')
  const [newQuestion, setNewQuestion] = useState(buildEmptyQuestion())

  const loadVideos = async () => {
    try {
      setVideosLoading(true)
      setVideosError('')
      const response = await fetchAdminVideos()
      setVideos(response.entries || [])
    } catch (err) {
      setVideosError(err.message || 'Не удалось загрузить видео')
    } finally {
      setVideosLoading(false)
    }
  }

  const loadQuestions = async () => {
    try {
      setQuestionsLoading(true)
      setQuestionsError('')
      const response = await fetchAdminQuestions()
      setQuestions(response.entries || [])
    } catch (err) {
      setQuestionsError(err.message || 'Не удалось загрузить вопросы')
    } finally {
      setQuestionsLoading(false)
    }
  }

  useEffect(() => {
    loadVideos()
    loadQuestions()
  }, [])

  const handleFileChange = (teamKey, file) => {
    setPendingFiles((prev) => ({
      ...prev,
      [teamKey]: file || null,
    }))
  }

  const handleUpload = async (teamKey) => {
    const file = pendingFiles[teamKey]
    if (!file) {
      setVideosError('Выберите видеофайл для загрузки')
      return
    }

    try {
      setUploadingKey(teamKey)
      setVideosError('')
      await uploadAdminVideo(teamKey, file)
      setPendingFiles((prev) => ({ ...prev, [teamKey]: null }))
      await loadVideos()
    } catch (err) {
      setVideosError(err.message || 'Не удалось загрузить видео')
    } finally {
      setUploadingKey('')
    }
  }

  const handleNewTeamUpload = async () => {
    const trimmedName = newTeamName.trim()
    if (!trimmedName) {
      setNewTeamError('Введите название команды')
      return
    }
    if (trimmedName.toLowerCase() === DEFAULT_VIDEO_KEY) {
      setNewTeamError('Название команды зарезервировано')
      return
    }
    if (trimmedName.includes('/') || trimmedName.includes('\\')) {
      setNewTeamError('Уберите символы / и \\ из названия')
      return
    }
    if (!newTeamFile) {
      setNewTeamError('Выберите видеофайл')
      return
    }

    try {
      setNewTeamError('')
      setUploadingKey(trimmedName)
      await uploadAdminVideo(trimmedName, newTeamFile)
      setNewTeamName('')
      setNewTeamFile(null)
      await loadVideos()
    } catch (err) {
      setNewTeamError(err.message || 'Не удалось загрузить видео')
    } finally {
      setUploadingKey('')
    }
  }

  const setQuestionBusy = (questionId, value) => {
    setQuestionBusyIds((prev) => ({ ...prev, [questionId]: value }))
  }

  const updateQuestionField = (questionId, field, value) => {
    setQuestions((prev) =>
      prev.map((item) =>
        item.id === questionId ? { ...item, [field]: value } : item,
      ),
    )
  }

  const handleQuestionSave = async (question) => {
    try {
      setQuestionActionError('')
      setQuestionBusy(question.id, true)
      const payload = {
        question: question.question.trim(),
        answer: Boolean(question.answer),
        is_active: Boolean(question.is_active),
      }
      const saved = await updateAdminQuestion(question.id, payload)
      setQuestions((prev) =>
        prev.map((item) => (item.id === question.id ? saved : item)),
      )
    } catch (err) {
      setQuestionActionError(err.message || 'Не удалось обновить вопрос')
    } finally {
      setQuestionBusy(question.id, false)
    }
  }

  const handleQuestionDelete = async (questionId) => {
    try {
      setQuestionActionError('')
      setQuestionBusy(questionId, true)
      await deleteAdminQuestion(questionId)
      setQuestions((prev) => prev.filter((item) => item.id !== questionId))
    } catch (err) {
      setQuestionActionError(err.message || 'Не удалось удалить вопрос')
    } finally {
      setQuestionBusy(questionId, false)
    }
  }

  const handleNewQuestionChange = (field, value) => {
    setNewQuestion((prev) => ({ ...prev, [field]: value }))
  }

  const handleNewQuestionAdd = async () => {
    if (!newQuestion.question.trim()) {
      setQuestionActionError('Введите текст вопроса')
      return
    }

    try {
      setQuestionActionError('')
      const payload = {
        question: newQuestion.question.trim(),
        answer: Boolean(newQuestion.answer),
        is_active: Boolean(newQuestion.is_active),
      }
      const created = await createAdminQuestion(payload)
      setQuestions((prev) => [...prev, created])
      setNewQuestion(buildEmptyQuestion())
    } catch (err) {
      setQuestionActionError(err.message || 'Не удалось добавить вопрос')
    }
  }

  return (
    <div className="page">
      <div className="card-panel wide admin-panel">
        <div className="admin-header">
          <div>
            <h1>Админка</h1>
            <p className="subtitle">
              Управление видео для команд и вопросами «Правда или ложь».
            </p>
          </div>
          <Link className="link-button" to="/">
            К регистрации
          </Link>
        </div>

        <section className="admin-section">
          <div className="admin-section-header">
            <div>
              <h2>Видео для команд</h2>
              <p className="subtitle">
                Загружайте ролики в формате mp4 или mov.
              </p>
            </div>
            <button
              type="button"
              className="ghost"
              onClick={loadVideos}
              disabled={videosLoading}
            >
              Обновить
            </button>
          </div>

          {videosError && <div className="error">{videosError}</div>}
          {videosLoading && <p>Загружаем список видео...</p>}

          {!videosLoading && (
            <div className="admin-video-list">
              {videos.map((entry) => (
                <div key={entry.key} className="admin-video-row">
                  <div className="admin-video-info">
                    <div className="admin-video-title">
                      {entry.is_default ? 'Общее видео' : entry.team}
                    </div>
                    <div className="admin-video-meta">
                      <span>
                        {entry.filename || 'Файл ещё не загружен'}
                      </span>
                      {entry.url && (
                        <a
                          href={`${API_BASE}${entry.url}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Посмотреть
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="admin-video-actions">
                    <input
                      type="file"
                      accept="video/*"
                      onChange={(event) =>
                        handleFileChange(
                          entry.key,
                          event.target.files?.[0] || null,
                        )
                      }
                    />
                    <button
                      type="button"
                      onClick={() => handleUpload(entry.key)}
                      disabled={
                        !pendingFiles[entry.key] ||
                        uploadingKey === entry.key
                      }
                    >
                      {uploadingKey === entry.key ? 'Загружаем...' : 'Загрузить'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="admin-add-video">
            <h3>Добавить команду</h3>
            <div className="admin-add-video-grid">
              <label className="field">
                <span>Название команды (папка)</span>
                <input
                  value={newTeamName}
                  onChange={(event) => setNewTeamName(event.target.value)}
                  placeholder="Например, Сопровождение ОСА"
                />
              </label>
              <label className="field">
                <span>Видео</span>
                <input
                  type="file"
                  accept="video/*"
                  onChange={(event) =>
                    setNewTeamFile(event.target.files?.[0] || null)
                  }
                />
              </label>
            </div>
            {newTeamError && <div className="error">{newTeamError}</div>}
            <button
              type="button"
              onClick={handleNewTeamUpload}
              disabled={uploadingKey === newTeamName.trim()}
            >
              {uploadingKey === newTeamName.trim()
                ? 'Загружаем...'
                : 'Создать и загрузить'}
            </button>
          </div>
        </section>

        <section className="admin-section">
          <div className="admin-section-header">
            <div>
              <h2>Вопросы «Правда или ложь»</h2>
              <p className="subtitle">
                Включайте или отключайте вопросы перед игрой.
              </p>
            </div>
            <button
              type="button"
              className="ghost"
              onClick={loadQuestions}
              disabled={questionsLoading}
            >
              Обновить
            </button>
          </div>

          {questionsError && <div className="error">{questionsError}</div>}
          {questionActionError && (
            <div className="error">{questionActionError}</div>
          )}
          {questionsLoading && <p>Загружаем вопросы...</p>}

          {!questionsLoading && (
            <div className="admin-question-list">
              {questions.map((question) => (
                <div key={question.id} className="admin-question-row">
                  <label className="field">
                    <span>Вопрос</span>
                    <textarea
                      value={question.question}
                      onChange={(event) =>
                        updateQuestionField(
                          question.id,
                          'question',
                          event.target.value,
                        )
                      }
                      rows={3}
                    />
                  </label>
                  <div className="admin-question-controls">
                    <label className="field">
                      <span>Ответ</span>
                      <select
                        value={question.answer ? 'true' : 'false'}
                        onChange={(event) =>
                          updateQuestionField(
                            question.id,
                            'answer',
                            event.target.value === 'true',
                          )
                        }
                      >
                        <option value="true">Правда</option>
                        <option value="false">Ложь</option>
                      </select>
                    </label>
                    <label className="field field-inline">
                      <span>Активен</span>
                      <input
                        type="checkbox"
                        checked={Boolean(question.is_active)}
                        onChange={(event) =>
                          updateQuestionField(
                            question.id,
                            'is_active',
                            event.target.checked,
                          )
                        }
                      />
                    </label>
                    <div className="admin-question-actions">
                      <button
                        type="button"
                        onClick={() => handleQuestionSave(question)}
                        disabled={questionBusyIds[question.id]}
                      >
                        {questionBusyIds[question.id]
                          ? 'Сохраняем...'
                          : 'Сохранить'}
                      </button>
                      <button
                        type="button"
                        className="ghost danger"
                        onClick={() => handleQuestionDelete(question.id)}
                        disabled={questionBusyIds[question.id]}
                      >
                        Удалить
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="admin-add-question">
            <h3>Добавить вопрос</h3>
            <label className="field">
              <span>Текст вопроса</span>
              <textarea
                value={newQuestion.question}
                onChange={(event) =>
                  handleNewQuestionChange('question', event.target.value)
                }
                rows={3}
              />
            </label>
            <div className="admin-question-controls">
              <label className="field">
                <span>Ответ</span>
                <select
                  value={newQuestion.answer ? 'true' : 'false'}
                  onChange={(event) =>
                    handleNewQuestionChange(
                      'answer',
                      event.target.value === 'true',
                    )
                  }
                >
                  <option value="true">Правда</option>
                  <option value="false">Ложь</option>
                </select>
              </label>
              <label className="field field-inline">
                <span>Активен</span>
                <input
                  type="checkbox"
                  checked={newQuestion.is_active}
                  onChange={(event) =>
                    handleNewQuestionChange('is_active', event.target.checked)
                  }
                />
              </label>
            </div>
            <button type="button" onClick={handleNewQuestionAdd}>
              Добавить вопрос
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}
