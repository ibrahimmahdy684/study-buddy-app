import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import SignIn from './pages/SignIn'
import SignUp from './pages/SignUp'
import StudyPreferences from './pages/StudyPreferences'
import { Dashboard } from './pages/Dashboard'
import ProfileSetup from './pages/ProfileSetup'
import Profile from './pages/Profile'
import Notifications from './pages/Notifications'
import Messages from './pages/Messages'
import Chat from './pages/Chat'
import { DashboardShell } from './components'

function App() {
  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <Routes>
        {/* Public / standalone routes (no sidebar) */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<SignIn />} />
        <Route path="/register" element={<SignUp />} />
        <Route path="/study-preferences" element={<StudyPreferences />} />

        {/* Authenticated app shell (Navbar + Sidebar wrap every child) */}
        <Route element={<DashboardShell />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/profile-setup" element={<ProfileSetup />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/messages/:conversationId" element={<Chat />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
