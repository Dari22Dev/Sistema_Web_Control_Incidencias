import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Aplica el tema antes del primer render para evitar destellos.
const storedTheme = localStorage.getItem('theme')
const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)')?.matches
const initialTheme = storedTheme === 'light' || storedTheme === 'dark'
  ? storedTheme
  : (prefersDark ? 'dark' : 'light')
document.documentElement.setAttribute('data-theme', initialTheme)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
