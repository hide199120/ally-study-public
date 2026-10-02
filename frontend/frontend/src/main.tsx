import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import Room from './components/room/Room.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Room />
  </StrictMode>,
)
