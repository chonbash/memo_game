import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import './App.css'
import Register from './pages/Register.jsx'
import Game from './pages/Game.jsx'
import Victory from './pages/Victory.jsx'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Register />} />
        <Route path="/game" element={<Game />} />
        <Route path="/victory" element={<Victory />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
