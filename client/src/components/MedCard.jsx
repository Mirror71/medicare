import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, Clock, Utensils, MoreVertical, AlertTriangle, Pill, Activity, Pencil, Trash2 } from 'lucide-react'
import { useMedication } from '../store/MedicationContext'
import SideEffectModal from './SideEffectModal'

const FOOD_LABELS = {
  before_food: 'Before food',
  with_food: 'With food',
  after_food: 'After food',
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
    'relative flex items-center gap-3 rounded-3xl p-5 shadow-sm transition-colors duration-300',
    taken
      ? 'bg-safe/5 border-l-[5px] border-safe'
      : overdue
        ? 'bg-surface border-l-[5px] border-danger'
        : 'bg-surface',
  ].join(' ')

  return (
    <div className={cardCls}>
      {/* Left: details */}
      <div className={`min-w-0 flex-1 ${taken ? 'opacity-70' : ''}`}>
        <div className="flex items-center gap-2">
          <span className="truncate text-xl font-bold">{med.name}</span>
          {overdue && !taken && (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-danger/10 px-2.5 py-1 text-base font-semibold text-danger">
              <AlertTriangle size={16} /> Missed
            </span>
          )}
        </div>
        <div className="mt-0.5 text-lg text-uncertain-text">
          {med.dosage_amount} {med.dosage_unit}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-border/40 px-3 py-1 text-base font-medium text-uncertain-text">
            <Clock size={16} /> {timeStr}
          </span>
          {foodLabel && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-border/40 px-3 py-1 text-base text-uncertain-text">
              <Utensils size={16} /> {foodLabel}
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
          'flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-300 disabled:opacity-60',
          taken
            ? 'border-safe bg-safe text-white ring-4 ring-safe/20'
            : 'border-border bg-surface text-border hover:border-safe/50 active:scale-95',
        ].join(' ')}
      >
        <Check size={30} strokeWidth={3} />
      </button>

      {/* Overflow menu */}
      <div className="relative shrink-0" ref={menuRef}>
        <button
          type="button"
          aria-label="More actions"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((o) => !o)}
          className="flex h-12 w-12 items-center justify-center rounded-full text-uncertain-text hover:bg-border/40"
        >
          <MoreVertical size={24} />
        </button>
        {menuOpen && (
          <div
            role="menu"
            className="absolute right-0 top-14 z-20 w-64 overflow-hidden rounded-2xl border border-border bg-surface py-1 shadow-lg"
          >
            <MenuItem icon={Pill} onClick={() => { setMenuOpen(false); setShowSideEffects(true) }}>
              Learn about side effects
            </MenuItem>
            <MenuItem icon={Activity} onClick={() => { setMenuOpen(false); navigate(`/dashboard/interactions?focus=${med.id}`) }}>
              Check interactions
            </MenuItem>
            <MenuItem icon={Pencil} onClick={() => { setMenuOpen(false); navigate(`/edit/${med.id}`) }}>
              Edit
            </MenuItem>
            <MenuItem icon={Trash2} danger onClick={handleDelete}>
              Delete
            </MenuItem>
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

function MenuItem({ icon: Icon, children, onClick, danger }) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={
        'flex w-full items-center gap-3 px-4 py-3 text-left text-base ' +
        (danger ? 'text-danger hover:bg-danger/5' : 'hover:bg-border/30')
      }
    >
      <Icon size={20} className="shrink-0" />
      {children}
    </button>
  )
}
