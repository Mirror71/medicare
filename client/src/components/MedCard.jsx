import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMedication } from '../store/MedicationContext'
import SideEffectModal from './SideEffectModal'

const FOOD_LABELS = {
  before_food: '⏱️ Before food',
  with_food: '🍽️ With food',
  after_food: '🍽️ After food',
  no_preference: null,
}

/**
 * One card per dose slot.
 * Props:
 *  - slot: { med, timeStr, scheduledAt, scheduledAtISO, taken }
 *  - overdue: boolean (slot is in missedDoses and not taken)
 */
export default function MedCard({ slot, overdue }) {
  const { med, timeStr, scheduledAt, taken } = slot
  const navigate = useNavigate()
  const { toggleDose, deleteMedication } = useMedication()

  const [menuOpen, setMenuOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [showSideEffects, setShowSideEffects] = useState(false)
  const menuRef = useRef(null)

  // Close the overflow menu on outside click / Escape.
  useEffect(() => {
    if (!menuOpen) return
    const onClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    const onKey = (e) => e.key === 'Escape' && setMenuOpen(false)
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  async function handleToggle() {
    if (busy) return
    setBusy(true)
    try {
      await toggleDose(med.id, scheduledAt)
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete() {
    setMenuOpen(false)
    if (!window.confirm(`Remove ${med.name} from your medicines?`)) return
    try {
      await deleteMedication(med.id)
    } catch (err) {
      window.alert(err.message || 'Could not delete. Please try again.')
    }
  }

  const foodLabel = FOOD_LABELS[med.food_relation]

  const cardCls = [
    'relative flex items-center gap-3 rounded-2xl border p-4 shadow-sm transition-colors',
    taken ? 'border-green-200 bg-[#F0FDF4]' : 'border-slate-200 bg-white',
    overdue && !taken ? 'border-l-4 border-l-[var(--color-danger)]' : '',
  ].join(' ')

  return (
    <div className={cardCls}>
      {/* Left: details */}
      <div className={`min-w-0 flex-1 ${taken ? 'opacity-70' : ''}`}>
        <div className="flex items-center gap-2">
          <span className="truncate text-xl font-bold">{med.name}</span>
          {overdue && !taken && (
            <span className="shrink-0 rounded-full bg-red-50 px-2 py-0.5 text-base font-semibold text-[var(--color-danger)]">
              Missed
            </span>
          )}
        </div>
        <div className="mt-0.5 text-lg text-[var(--color-uncertain-text)]">
          {med.dosage_amount} {med.dosage_unit}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="text-base font-medium text-slate-500">🕒 {timeStr}</span>
          {foodLabel && (
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-base text-slate-600">
              {foodLabel}
            </span>
          )}
        </div>
      </div>

      {/* Right: taken toggle */}
      <button
        type="button"
        role="checkbox"
        aria-checked={taken}
        aria-label={taken ? `Mark ${med.name} not taken` : `Mark ${med.name} taken`}
        disabled={busy}
        onClick={handleToggle}
        className={[
          'flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 text-2xl transition-colors disabled:opacity-60',
          taken
            ? 'border-[var(--color-safe)] bg-[var(--color-safe)] text-white'
            : 'border-slate-300 bg-white text-transparent',
        ].join(' ')}
      >
        ✓
      </button>

      {/* Overflow menu */}
      <div className="relative shrink-0" ref={menuRef}>
        <button
          type="button"
          aria-label="More actions"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((o) => !o)}
          className="flex h-12 w-12 items-center justify-center rounded-full text-2xl text-slate-500 hover:bg-slate-100"
        >
          ⋯
        </button>
        {menuOpen && (
          <div
            role="menu"
            className="absolute right-0 top-14 z-20 w-60 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
          >
            <button
              type="button"
              role="menuitem"
              className="block w-full px-4 py-3 text-left text-base hover:bg-slate-50"
              onClick={() => { setMenuOpen(false); setShowSideEffects(true) }}
            >
              Learn about side effects
            </button>
            <button
              type="button"
              role="menuitem"
              className="block w-full px-4 py-3 text-left text-base hover:bg-slate-50"
              onClick={() => { setMenuOpen(false); navigate(`/dashboard/interactions?focus=${med.id}`) }}
            >
              Check interactions
            </button>
            <button
              type="button"
              role="menuitem"
              className="block w-full px-4 py-3 text-left text-base hover:bg-slate-50"
              onClick={() => { setMenuOpen(false); navigate(`/edit/${med.id}`) }}
            >
              Edit
            </button>
            <button
              type="button"
              role="menuitem"
              className="block w-full px-4 py-3 text-left text-base text-[var(--color-danger)] hover:bg-red-50"
              onClick={handleDelete}
            >
              Delete
            </button>
          </div>
        )}
      </div>

      {showSideEffects && (
        <SideEffectModal
          medicationName={med.name}
          onClose={() => setShowSideEffects(false)}
        />
      )}
    </div>
  )
}
