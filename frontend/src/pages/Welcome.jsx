import { useNavigate } from 'react-router-dom'

export default function Welcome() {
  const navigate = useNavigate()

  return (
    <div className="welcome-page">
      <div className="welcome-image-container">
        <img
          src={`${import.meta.env.BASE_URL}welcome.png`}
          alt=""
          className="welcome-image"
        />
        <div className="welcome-overlay">
          <h1 className="welcome-slogan">Здравствуй, герой! 
          Время начать твоё приключение</h1>
          <div className="welcome-overlay-spacer" />
          <button onClick={() => navigate('/game')}>Начать игру</button>
        </div>
      </div>
    </div>
  )
}
