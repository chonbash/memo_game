import { Link } from 'react-router-dom'
import { getVideoUrl } from '../api.js'

export default function Victory() {
  return (
    <div className="page">
      <div className="card-panel wide">
        <h1>Поздравляем!</h1>
        <p className="subtitle">Вы прошли игру. Наслаждайтесь видео.</p>
        <div className="video-wrapper">
          <video src={getVideoUrl()} controls autoPlay />
        </div>
        <Link className="link-button" to="/">
          Вернуться к регистрации
        </Link>
      </div>
    </div>
  )
}
