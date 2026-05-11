import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { DashboardShell, Spinner } from './components'

const LandingPage = lazy(() => import('./pages/LandingPage'))
const SignIn = lazy(() => import('./pages/SignIn'))
const SignUp = lazy(() => import('./pages/SignUp'))
const StudyPreferences = lazy(() => import('./pages/StudyPreferences'))
const Dashboard = lazy(() => import('./pages/Dashboard').then((m) => ({ default: m.Dashboard })))
const ProfileSetup = lazy(() => import('./pages/ProfileSetup'))
const Profile = lazy(() => import('./pages/Profile'))
const Notifications = lazy(() => import('./pages/Notifications'))
const Messages = lazy(() => import('./pages/Messages'))
const Chat = lazy(() => import('./pages/Chat'))
const Matching = lazy(() => import('./pages/Matching'))
const Sessions = lazy(() => import('./pages/Sessions'))
const MatchDetails = lazy(() => import('./pages/MatchDetails'))
const CreateSession = lazy(() => import('./pages/CreateSession'))

function App() {
  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <Suspense fallback={<div className="flex justify-center items-center h-screen"><Spinner size="lg" /></div>}>
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
            <Route path="/matching" element={<Matching />} />
            <Route path="/matching/:buddyId" element={<MatchDetails />} />
            <Route path="/sessions" element={<Sessions />} />
            <Route path="/sessions/create" element={<CreateSession />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/messages/:conversationId" element={<Chat />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

export default App
