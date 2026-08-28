import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { GameServerProvider } from '@agent8/gameserver'
import App from './App'
import { installUiSounds } from './audio'
import './index.css'

installUiSounds()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GameServerProvider>
      <App />
    </GameServerProvider>
  </StrictMode>,
)
