import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LandingPage from './pages/LandingPage'

function PlaceholderPage({ title }) {
  return (
    <main className="placeholder-page">
      <h1>{title}</h1>
      <p>This page will be implemented next.</p>
    </main>
  )
}

function App() {
  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/dashboard" element={<Navigate to="/" replace />} />
        <Route path="/login" element={<PlaceholderPage title="Sign In" />} />
        <Route path="/register" element={<PlaceholderPage title="Sign Up" />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
