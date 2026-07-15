import { useNavigate } from 'react-router-dom'
import { useMedication } from '../store/MedicationContext'

export default function Landing() {
  const navigate = useNavigate()
  const { medications } = useMedication()
  const hasMeds = medications.length > 0

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center px-7 pt-16 pb-10">
      {/* Hero icon */}
      <div className="w-[120px] h-[120px] rounded-full bg-primary/10 flex items-center justify-center mb-8">
        <svg width="68" height="68" viewBox="0 0 68 68" fill="none">
          <rect x="13" y="22" width="30" height="36" rx="5" className="fill-primary/20 stroke-primary" strokeWidth="2" />
          <rect x="17" y="12" width="22" height="13" rx="3.5" className="fill-primary/30 stroke-primary" strokeWidth="1.8" />
          <rect x="19" y="32" width="18" height="2.5" rx="1.2" className="fill-primary" opacity="0.45" />
          <rect x="19" y="37.5" width="13" height="2.5" rx="1.2" className="fill-primary" opacity="0.45" />
          <rect x="19" y="43" width="16" height="2.5" rx="1.2" className="fill-primary" opacity="0.45" />
          <circle cx="51" cy="48" r="13" className="fill-primary" />
          <path d="M44.5 48.5l4 4 7-8" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      {/* Title + tagline (locked copy — do not reword) */}
      <h1 className="text-2xl font-bold text-text text-center mb-3">MediCare Companion</h1>
      <p className="text-base text-uncertain-text text-center max-w-[230px] mb-16 leading-relaxed">
        Your medicines, checked and explained in plain language.
      </p>

      {/* CTA */}
      <button
        onClick={() => navigate(hasMeds ? '/dashboard' : '/add')}
        className="w-full max-w-sm py-4 rounded-full bg-primary text-white font-semibold text-base mb-7 active:scale-[0.98] transition-transform"
      >
        {hasMeds ? 'Open my medicines' : 'Get started'}
      </button>

      {/* Reassurance row */}
      <div className="flex justify-around w-full max-w-sm gap-2 mt-auto">
        <FeatureItem icon={<ShieldIcon />} label="Interaction checks" />
        <FeatureItem icon={<ChatIcon />} label="Plain-language answers" />
        <FeatureItem icon={<BellIcon />} label="Dose reminders" />
      </div>
    </div>
  )
}

function FeatureItem({ icon, label }) {
  return (
    <div className="flex flex-col items-center gap-2 flex-1">
      <div className="text-primary">{icon}</div>
      <span className="text-xs text-uncertain-text text-center leading-tight">{label}</span>
    </div>
  )
}

function ShieldIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  )
}
function ChatIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      <line x1="9" y1="10" x2="15" y2="10" />
      <line x1="9" y1="14" x2="13" y2="14" />
    </svg>
  )
}
function BellIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  )
}