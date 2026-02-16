import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  API_BASE,
  clearAdminAuth,
  createAdminQuestion,
  deleteAdminQuestion,
  deleteAdminTeam,
  fetchAdminTeams,
  fetchAdminQuestions,
  fetchAdminVideos,
  isAdminAuthenticated,
  resetAdminResults,
  updateAdminTeam,
  updateAdminQuestion,
  uploadAdminVideo,
  verifyAdminPassword,
} from '../api.js'

const DEFAULT_VIDEO_KEY = 'default'

const buildEmptyQuestion = () => ({
  statement: '',
  is_true: true,
  is_active: true,
})

export default function Admin() {
  const [authenticated, setAuthenticated] = useState(isAdminAuthenticated())
  const [password, setPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)

  const [videos, setVideos] = useState([])
  const [videosLoading, setVideosLoading] = useState(true)
  const [videosError, setVideosError] = useState('')
  const [pendingFiles, setPendingFiles] = useState({})
  const [uploadingKey, setUploadingKey] = useState('')
  const [newTeamName, setNewTeamName] = useState('')
  const [newTeamFile, setNewTeamFile] = useState(null)
  const [newTeamError, setNewTeamError] = useState('')

  const [teams, setTeams] = useState([])
  const [teamsLoading, setTeamsLoading] = useState(true)
  const [teamsError, setTeamsError] = useState('')
  const [teamActionError, setTeamActionError] = useState('')
  const [teamBusyIds, setTeamBusyIds] = useState({})

  const [questions, setQuestions] = useState([])
  const [questionsLoading, setQuestionsLoading] = useState(true)
  const [questionsError, setQuestionsError] = useState('')
  const [questionBusyIds, setQuestionBusyIds] = useState({})
  const [questionActionError, setQuestionActionError] = useState('')
  const [newQuestion, setNewQuestion] = useState(buildEmptyQuestion())
  const [resetResultsBusy, setResetResultsBusy] = useState(false)
  const [resetResultsError, setResetResultsError] = useState('')

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

  const loadTeams = async () => {
    try {
      setTeamsLoading(true)
      setTeamsError('')
      const response = await fetchAdminTeams()
      setTeams(
        (response.entries || []).map((entry) => ({
          ...entry,
          original_team: entry.team,
        })),
      )
    } catch (err) {
      setTeamsError(err.message || 'Не удалось загрузить команды')
    } finally {
      setTeamsLoading(false)
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
    if (authenticated) {
      loadVideos()
      loadTeams()
      loadQuestions()
    }
  }, [authenticated])

  const handlePasswordSubmit = async (e) => {
    e.preventDefault()
    const pwd = password.trim()
    if (!pwd) {
      setPasswordError('Введите пароль')
      return
    }
    try {
      setPasswordError('')
      setPasswordLoading(true)
      await verifyAdminPassword(pwd)
      setAuthenticated(true)
      setPassword('')
    } catch (err) {
      setPasswordError(err.message || 'Неверный пароль')
    } finally {
      setPasswordLoading(false)
    }
  }

  const handleLogout = () => {
    clearAdminAuth()
    setAuthenticated(false)
  }

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
      await Promise.all([loadVideos(), loadTeams()])
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
      await Promise.all([loadVideos(), loadTeams()])
    } catch (err) {
      setNewTeamError(err.message || 'Не удалось загрузить видео')
    } finally {
      setUploadingKey('')
    }
  }

  const setQuestionBusy = (questionId, value) => {
    setQuestionBusyIds((prev) => ({ ...prev, [questionId]: value }))
  }

  const setTeamBusy = (teamKey, value) => {
    setTeamBusyIds((prev) => ({ ...prev, [teamKey]: value }))
  }

  const updateQuestionField = (questionId, field, value) => {
    setQuestions((prev) =>
      prev.map((item) =>
        item.id === questionId ? { ...item, [field]: value } : item,
      ),
    )
  }

  const updateTeamField = (teamKey, field, value) => {
    setTeams((prev) =>
      prev.map((item) =>
        item.original_team === teamKey ? { ...item, [field]: value } : item,
      ),
    )
  }

  const handleTeamSave = async (team) => {
    if (!team.team.trim()) {
      setTeamActionError('Введите название команды')
      return
    }
    if (!team.media_path.trim()) {
      setTeamActionError('Укажите путь к видео')
      return
    }

    try {
      setTeamActionError('')
      setTeamBusy(team.original_team, true)
      const payload = {
        team: team.team.trim(),
        media_path: team.media_path.trim(),
      }
      const saved = await updateAdminTeam(team.original_team, payload)
      setTeams((prev) =>
        prev.map((item) =>
          item.original_team === team.original_team
            ? { ...saved, original_team: saved.team }
            : item,
        ),
      )
      await loadVideos()
    } catch (err) {
      setTeamActionError(err.message || 'Не удалось обновить команду')
    } finally {
      setTeamBusy(team.original_team, false)
    }
  }

  const handleTeamDelete = async (team) => {
    const confirmed = window.confirm(
      `Удалить команду «${team.team}» из списка?`,
    )
    if (!confirmed) {
      return
    }
    try {
      setTeamActionError('')
      setTeamBusy(team.original_team, true)
      await deleteAdminTeam(team.original_team)
      setTeams((prev) =>
        prev.filter((item) => item.original_team !== team.original_team),
      )
      await loadVideos()
    } catch (err) {
      setTeamActionError(err.message || 'Не удалось удалить команду')
    } finally {
      setTeamBusy(team.original_team, false)
    }
  }

  const handleQuestionSave = async (question) => {
    try {
      setQuestionActionError('')
      setQuestionBusy(question.id, true)
      const payload = {
        statement: question.statement.trim(),
        is_true: Boolean(question.is_true),
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
    if (!newQuestion.statement.trim()) {
      setQuestionActionError('Введите текст вопроса')
      return
    }

    try {
      setQuestionActionError('')
      const payload = {
        statement: newQuestion.statement.trim(),
        is_true: Boolean(newQuestion.is_true),
        is_active: Boolean(newQuestion.is_active),
      }
      const created = await createAdminQuestion(payload)
      setQuestions((prev) => [...prev, created])
      setNewQuestion(buildEmptyQuestion())
    } catch (err) {
      setQuestionActionError(err.message || 'Не удалось добавить вопрос')
    }
  }

  const handleResetResults = async () => {
    const confirmed = window.confirm(
      'Удалить все результаты игр (счёт и статистика команд будут обнулены)?',
    )
    if (!confirmed) return
    try {
      setResetResultsError('')
      setResetResultsBusy(true)
      await resetAdminResults()
    } catch (err) {
      setResetResultsError(err.message || 'Не удалось сбросить результаты')
    } finally {
      setResetResultsBusy(false)
    }
  }

  if (!authenticated) {
    return (
      <div className="page">
        <div className="card-panel wide admin-panel" style={{ maxWidth: '24rem' }}>
          <h1>Админка</h1>
          <p className="subtitle">Введите пароль для входа</p>
          <form onSubmit={handlePasswordSubmit}>
            <label className="field">
              <span>Пароль</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Пароль"
                autoFocus
                autoComplete="current-password"
              />
            </label>
            {passwordError && <div className="error">{passwordError}</div>}
            <button type="submit" disabled={passwordLoading}>
              {passwordLoading ? 'Проверка...' : 'Войти'}
            </button>
          </form>
        </div>
      </div>
    )
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
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <button
              type="button"
              className="ghost danger"
              onClick={handleResetResults}
              disabled={resetResultsBusy}
            >
              {resetResultsBusy ? 'Сброс...' : 'Сброс результатов'}
            </button>
            <button type="button" className="ghost" onClick={handleLogout}>
              Выйти
            </button>
            <Link className="link-button" to="/">
              К регистрации
            </Link>
          </div>
        </div>
        {resetResultsError && (
          <div className="error">{resetResultsError}</div>
        )}

        <div className="admin-layout">
          <nav className="admin-sidebar">
            <div className="admin-sidebar-title">Разделы</div>
            <a className="admin-sidebar-link" href="#admin-videos">
              Видео
            </a>
            <a className="admin-sidebar-link" href="#admin-teams">
              Команды
            </a>
            <a className="admin-sidebar-link" href="#admin-truth">
              Правда или ложь
            </a>
          </nav>

          <div className="admin-content">
            <section id="admin-videos" className="admin-section">
              <div className="admin-section-header">
                <div>
                  <h2>Видео</h2>
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
                          {uploadingKey === entry.key
                            ? 'Загружаем...'
                            : 'Загрузить'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section id="admin-teams" className="admin-section">
              <div className="admin-section-header">
                <div>
                  <h2>Команды</h2>
                  <p className="subtitle">Создавайте новые команды и видео.</p>
                </div>
                <button
                  type="button"
                  className="ghost"
                  onClick={loadTeams}
                  disabled={teamsLoading}
                >
                  Обновить
                </button>
              </div>
              {teamsError && <div className="error">{teamsError}</div>}
              {teamActionError && (
                <div className="error">{teamActionError}</div>
              )}
              {teamsLoading && <p>Загружаем команды...</p>}

              {!teamsLoading && (
                <div className="admin-team-list">
                  {teams.map((team) => (
                    <div key={team.original_team} className="admin-team-row">
                      <div className="admin-team-fields">
                        <label className="field">
                          <span>Название</span>
                          <input
                            value={team.team}
                            onChange={(event) =>
                              updateTeamField(
                                team.original_team,
                                'team',
                                event.target.value,
                              )
                            }
                          />
                        </label>
                        <label className="field">
                          <span>Путь к видео</span>
                          <input
                            value={team.media_path}
                            onChange={(event) =>
                              updateTeamField(
                                team.original_team,
                                'media_path',
                                event.target.value,
                              )
                            }
                            placeholder="Команда/congrats.mp4"
                          />
                        </label>
                      </div>
                      <div className="admin-team-actions">
                        <button
                          type="button"
                          onClick={() => handleTeamSave(team)}
                          disabled={teamBusyIds[team.original_team]}
                        >
                          {teamBusyIds[team.original_team]
                            ? 'Сохраняем...'
                            : 'Сохранить'}
                        </button>
                        <button
                          type="button"
                          className="ghost danger"
                          onClick={() => handleTeamDelete(team)}
                          disabled={teamBusyIds[team.original_team]}
                        >
                          Удалить
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

            <section id="admin-truth" className="admin-section">
              <div className="admin-section-header">
                <div>
                  <h2>Правда или ложь</h2>
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
                          value={question.statement}
                          onChange={(event) =>
                            updateQuestionField(
                              question.id,
                              'statement',
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
                            value={question.is_true ? 'true' : 'false'}
                            onChange={(event) =>
                              updateQuestionField(
                                question.id,
                                'is_true',
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
                    value={newQuestion.statement}
                    onChange={(event) =>
                      handleNewQuestionChange('statement', event.target.value)
                    }
                    rows={3}
                  />
                </label>
                <div className="admin-question-controls">
                  <label className="field">
                    <span>Ответ</span>
                    <select
                      value={newQuestion.is_true ? 'true' : 'false'}
                      onChange={(event) =>
                        handleNewQuestionChange(
                          'is_true',
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
                        handleNewQuestionChange(
                          'is_active',
                          event.target.checked,
                        )
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
      </div>
    </div>
  )
}
