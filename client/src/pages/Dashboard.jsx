import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Sunrise, Sun, Sunset, Moon, AlertTriangle, PartyPopper, Plus, Pill, X } from 'lucide-react'
import { useMedication } from '../store/MedicationContext'
import { useNotifications } from '../hooks/useNotifications'
import MedCard from '../components/MedCard'

const SECTIONS = [
  { key: 'Morning', label: 'Morning', icon: Sunrise },
  { key: 'Afternoon', label: 'Afternoon', icon: Sun },
  { key: 'Evening', label: 'Evening', icon: Sunset },
  { key: 'Night', label: 'Night', icon: Moon },
]

const SEVERITY_STYLES = {
  danger: 'bg-danger text-white',
  caution: 'bg-caution text-white',
  uncertain: 'bg-uncertain text-white',
}

function formattedDate() {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

function percentColor(pct) {
  if (pct >= 80) return 'var(--color-safe)'
  if (pct >= 50) return 'var(--color-caution)'
  return 'var(--color-danger)'
}

export default function Dashboard() {
  const navigate = useNavigate()
  const {
    medications,
    loading,
    todaysSchedule,
    adherencePercent,
    missedDoses,
    activeWarnings,
    highestSeverity,
    checkingInteractions,
    interactionCheckError,
    dismissInteractionError,
  } = useMedication()

  const allSlots = useMemo(
    () => SECTIONS.flatMap((s) => todaysSchedule[s.key] ?? []),
    [todaysSchedule]
  )

  useNotifications(allSlots)

  const missedSet = useMemo(
    () => new Set(missedDoses.map((s) => s.scheduledAtISO)),
    [missedDoses]
  )

  const { dueCount, takenCount } = useMemo(() => {
    const currentHour = new Date().getHours()
    const due = allSlots.filter((s) => s.scheduledAt.getHours() <= currentHour)
    return { dueCount: due.length, takenCount: due.filter((s) => s.taken).length }
  }, [allSlots])

  const allDone = dueCount > 0 && takenCount === dueCount

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <main className="mx-auto max-w-2xl px-4">
        <Header navigate={navigate} />
        <div className="mt-4 flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-3xl bg-border/60" />
          ))}
        </div>
      </main>
    )
  }

  // ── Empty ──────────────────────────────────────────────────────────────────
  if (medications.length === 0) {
    return (
      <main className="mx-auto max-w-2xl px-4">
        <Header navigate={navigate} />
        <div className="mt-16 flex flex-col items-center text-center">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Pill size={52} />
          </div>
          <h2 className="mt-5 text-2xl font-bold">No medicines added yet</h2>
          <p className="mt-2 max-w-sm text-lg text-uncertain-text">
            Add your first medicine to start tracking your schedule
          </p>
          <button
            type="button"
            onClick={() => navigate('/add')}
            className="mt-6 flex min-h-14 items-center gap-1.5 rounded-2xl bg-primary px-6 text-lg font-semibold text-white shadow-sm"
          >
            <Plus size={22} /> Add your first medicine
          </button>
        </div>
      </main>
    )
  }

  // ── Main ───────────────────────────────────────────────────────────────────
  return (
    <main className="mx-auto max-w-2xl px-4">
      <Header navigate={navigate} />

      {/* Adherence card */}
      <div className="mt-3 rounded-3xl bg-surface p-5 text-lg shadow-sm">
        {dueCount === 0 ? (
          <span className="text-uncertain-text">No doses due yet today</span>
        ) : (
          <span>
            Today:{' '}
            <strong>
              {takenCount} of {dueCount} dose{dueCount === 1 ? '' : 's'} taken
            </strong>{' '}
            <span style={{ color: percentColor(adherencePercent) }} className="font-bold">
              ({adherencePercent}%)
            </span>
          </span>
        )}
      </div>

      {/* All-done banner */}
      {allDone && (
        <div className="mt-3 flex items-center gap-2 rounded-2xl bg-safe/10 px-4 py-3 text-lg font-semibold text-safe">
          <PartyPopper size={22} /> All doses taken today
        </div>
      )}

      {/* Interaction warning strip */}
      {activeWarnings.length > 0 && (
        <Link
          to="/dashboard/interactions"
          className={[
            'mt-3 flex items-center gap-2 rounded-2xl px-4 shadow-sm',
            SEVERITY_STYLES[highestSeverity] ?? SEVERITY_STYLES.uncertain,
            highestSeverity === 'danger' ? 'py-4 text-lg font-bold' : 'py-3 text-lg font-semibold',
          ].join(' ')}
        >
          <AlertTriangle size={22} className="shrink-0" />
          <span>
            {activeWarnings.length} possible interaction warning
            {activeWarnings.length === 1 ? '' : 's'} — tap to review
          </span>
        </Link>
      )}

      {/* Interaction check in progress */}
      {checkingInteractions && (
        <div className="mt-3 flex items-center gap-2 rounded-2xl bg-surface px-4 py-3 text-lg text-uncertain-text shadow-sm">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-border border-t-primary" />
          Checking interactions…
        </div>
      )}

      {/* Interaction check error */}
      {interactionCheckError && (
        <div className="mt-3 flex items-center justify-between gap-2 rounded-2xl bg-caution/10 px-4 py-3 text-lg text-caution shadow-sm">
          <span>{interactionCheckError}</span>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={dismissInteractionError}
            className="flex h-8 w-8 shrink-0 items-center justify-center"
          >
            <X size={20} />
          </button>
        </div>
      )}

      {/* Time-grouped dose cards */}
      <div className="mt-6 flex flex-col gap-8 pb-4">
        {SECTIONS.map(({ key, label, icon: Icon }) => {
          const slots = todaysSchedule[key] ?? []
          if (slots.length === 0) return null
          return (
            <section key={key}>
              <h2 className="mb-3 flex items-center gap-2 text-xl font-semibold text-uncertain-text">
                <Icon size={22} /> {label}
              </h2>
              <div className="flex flex-col gap-3">
                {slots.map((slot) => (
                  <MedCard
                    key={`${slot.med.id}-${slot.scheduledAtISO}`}
                    slot={slot}
                    overdue={missedSet.has(slot.scheduledAtISO)}
                  />
                ))}
              </div>
            </section>
          )
        })}
      </div>
    </main>
  )
}

function Header({ navigate }) {
  return (
    <header className="sticky top-0 z-30 -mx-4 flex items-center justify-between gap-3 bg-bg px-4 py-4">
      <h1 className="text-2xl font-bold">{formattedDate()}</h1>
      <button
        type="button"
        onClick={() => navigate('/add')}
        className="flex min-h-14 shrink-0 items-center gap-1.5 rounded-2xl bg-primary px-5 text-lg font-semibold text-white shadow-sm"
      >
        <Plus size={22} /> Add medicine
      </button>
    </header>
  )
}
