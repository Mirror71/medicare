import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMedication } from '../store/MedicationContext'
import { useNotifications } from '../hooks/useNotifications'
import MedCard from '../components/MedCard'

const SECTIONS = [
  { key: 'Morning', label: 'Morning', icon: '☀️' },
  { key: 'Afternoon', label: 'Afternoon', icon: '🌤️' },
  { key: 'Evening', label: 'Evening', icon: '🌙' },
  { key: 'Night', label: 'Night', icon: '🌑' },
]

const SEVERITY_STYLES = {
  danger: 'bg-[var(--color-danger)] text-white',
  caution: 'bg-[var(--color-caution)] text-white',
  uncertain: 'bg-[var(--color-uncertain)] text-white',
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
  } = useMedication()

  const allSlots = useMemo(
    () => SECTIONS.flatMap((s) => todaysSchedule[s.key] ?? []),
    [todaysSchedule]
  )

  // Notifications + reminders run off today's slots.
  useNotifications(allSlots)

  const missedSet = useMemo(
    () => new Set(missedDoses.map((s) => s.scheduledAtISO)),
    [missedDoses]
  )

  // Doses scheduled up to the current hour, and how many are taken.
  const { dueCount, takenCount } = useMemo(() => {
    const currentHour = new Date().getHours()
    const due = allSlots.filter((s) => s.scheduledAt.getHours() <= currentHour)
    return {
      dueCount: due.length,
      takenCount: due.filter((s) => s.taken).length,
    }
  }, [allSlots])

  const allDone = dueCount > 0 && takenCount === dueCount

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <main className="mx-auto max-w-2xl px-4">
        <Header navigate={navigate} />
        <div className="mt-4 flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-200" />
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
          <div className="text-[64px] leading-none">💊</div>
          <h2 className="mt-4 text-2xl font-bold">No medicines added yet</h2>
          <p className="mt-2 max-w-sm text-lg text-[var(--color-uncertain-text)]">
            Add your first medicine to start tracking your schedule
          </p>
          <button
            type="button"
            onClick={() => navigate('/add')}
            className="mt-6 min-h-12 rounded-xl bg-[var(--color-primary)] px-6 text-lg font-semibold text-white"
          >
            + Add your first medicine
          </button>
        </div>
      </main>
    )
  }

  // ── Main ───────────────────────────────────────────────────────────────────
  return (
    <main className="mx-auto max-w-2xl px-4">
      <Header navigate={navigate} />

      {/* Adherence strip */}
      <div className="mt-3 rounded-xl bg-white px-4 py-3 text-lg shadow-sm">
        {dueCount === 0 ? (
          <span className="text-[var(--color-uncertain-text)]">No doses due yet today</span>
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
        <div className="mt-3 rounded-xl border border-green-200 bg-[#F0FDF4] px-4 py-3 text-lg font-semibold text-[var(--color-safe)]">
          ✓ All done for now!
        </div>
      )}

      {/* Interaction warning strip */}
      {activeWarnings.length > 0 && (
        <Link
          to="/dashboard/interactions"
          className={[
            'mt-3 block rounded-xl px-4 shadow-sm',
            SEVERITY_STYLES[highestSeverity] ?? SEVERITY_STYLES.uncertain,
            highestSeverity === 'danger'
              ? 'py-4 text-lg font-bold'
              : 'py-3 text-lg font-semibold',
          ].join(' ')}
        >
          ⚠ {activeWarnings.length} possible interaction warning
          {activeWarnings.length === 1 ? '' : 's'} — tap to review
        </Link>
      )}

      {/* Time-grouped dose cards */}
      <div className="mt-4 flex flex-col gap-6 pb-8">
        {SECTIONS.map(({ key, label, icon }) => {
          const slots = todaysSchedule[key] ?? []
          if (slots.length === 0) return null
          return (
            <section key={key}>
              <h2 className="mb-2 text-lg font-semibold text-slate-500">
                {icon} {label}
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
    <header className="sticky top-0 z-30 -mx-4 bg-[var(--color-bg)] px-4 py-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{formattedDate()}</h1>
        <button
          type="button"
          onClick={() => navigate('/add')}
          className="min-h-12 shrink-0 rounded-xl bg-[var(--color-primary)] px-4 text-lg font-semibold text-white"
        >
          + Add medicine
        </button>
      </div>
      <nav className="mt-2 flex gap-5">
        <Link to="/caregiver" className="text-lg text-[var(--color-primary)] underline">
          👁️ Caregiver view
        </Link>
        <Link to="/chat" className="text-lg text-[var(--color-primary)] underline">
          💬 How do I feel?
        </Link>
      </nav>
    </header>
  )
}
