import { Routes, Route, useLocation } from 'react-router-dom'
import DisclaimerBanner from './components/DisclaimerBanner.jsx'
import BottomNav, { navHiddenFor } from './components/BottomNav.jsx'
import Landing from './pages/Landing.jsx'
import AddEditMedication from './pages/AddEditMedication.jsx'
import Dashboard from './pages/Dashboard.jsx'
import InteractionWarnings from './pages/InteractionWarnings.jsx'
import CaregiverView from './pages/CaregiverView.jsx'
import SymptomChat from './pages/SymptomChat.jsx'

export default function App() {
  const { pathname } = useLocation()
  const navVisible = !navHiddenFor(pathname)

  return (
    <div
      className={
        'min-h-screen bg-bg text-text ' +
        (navVisible ? 'pb-[calc(8.5rem+env(safe-area-inset-bottom))]' : 'pb-24')
      }
    >
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/add" element={<AddEditMedication />} />
        <Route path="/edit/:id" element={<AddEditMedication />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/dashboard/interactions" element={<InteractionWarnings />} />
        <Route path="/caregiver" element={<CaregiverView />} />
        <Route path="/chat" element={<SymptomChat />} />
      </Routes>
      <DisclaimerBanner raised={navVisible} />
      <BottomNav />
    </div>
  )
}
