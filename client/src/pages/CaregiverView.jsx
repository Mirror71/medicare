import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Eye, ArrowLeft, AlertTriangle, AlertOctagon, HelpCircle, ShieldCheck, Copy, Check } from 'lucide-react'
import { useMedication } from '../store/MedicationContext'

const SECTION_KEYS = ['Morning', 'Afternoon', 'Evening', 'Night']

const FOOD_LABELS = {
  before_food: 'before food',
  with_food: 'with food',
  after_food: 'after food',
  no_preference: 'any time',
}

const STATUS_ICON = { danger: AlertOctagon, caution: AlertTriangle, uncertain: HelpCircle, safe: ShieldCheck }
const STATUS_COLOR = {
  danger: 'var(--color-danger)',
  caution: 'var(--color-caution)',
  uncertain: 'var(--color-uncertain)',
  safe: 'var(--color-safe)',
}

function shortDate() {
  return new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}
function longDate() {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}
function percentColor(pct) {
  if (pct >= 80) return 'var(--color-safe)'
  if (pct >= 50) return 'var(--color-caution)'
  return 'var(--color-danger)'
}
function freqLabel(m) {
  const n = m.times_per_day ?? (m.times_of_day?.length || 1)
  return `${n}× daily`
}
function nextDoseLabel(times) {
  if (!times?.length) return '—'
  const now = new Date()
  const mins = now.getHours() * 60 + now.getMinutes()
  const sorted = [...times].sort()
  for (const t of sorted) {
    const [h, m] = t.split(':').map(Number)
    if (h * 60 + m >= mins) return t
  }
  return sorted[0] // wraps to tomorrow's first dose
}

export default function CaregiverView() {
  const {
    medications,
    loading,
    todaysSchedule,
    adherencePercent,
    missedDoses,
    activeWarnings,
  } = useMedication()

  const [copied, setCopied] = useState(false)

  const allSlots = useMemo(
    () => SECTION_KEYS.flatMap((k) => todaysSchedule[k] ?? []),
    [todaysSchedule]
  )

  const { dueCount, takenCount } = useMemo(() => {
    const currentHour = new Date().getHours()
    const due = allSlots.filter((s) => s.scheduledAt.getHours() <= currentHour)
    return { dueCount: due.length, takenCount: due.filter((s) => s.taken).length }
  }, [allSlots])

  const allDone = dueCount > 0 && takenCount === dueCount

  function buildSummary() {
    const lines = []
    lines.push('MediCare Companion — Caregiver Summary')
    lines.push(`Date: ${longDate()}`)
    lines.push('')
    lines.push(`Adherence: ${takenCount} of ${dueCount} doses taken (${adherencePercent}%)`)
    lines.push('')

    lines.push('Missed:')
    if (missedDoses.length === 0) lines.push('- none')
    else
      missedDoses.forEach((s) =>
        lines.push(`- ${s.med.name} ${s.med.dosage_amount}${s.med.dosage_unit} — due at ${s.timeStr}`)
      )
    lines.push('')

    lines.push('Warnings:')
    if (activeWarnings.length === 0) lines.push('- none')
    else
      activeWarnings.forEach((w) => {
        const tag =
          w.status === 'danger' && !w.acknowledged_at
            ? 'DANGER, not acknowledged'
            : String(w.status).toUpperCase()
        lines.push(`- ${w.drug_a} + ${w.drug_b}: ${w.headline} (${tag})`)
      })
    lines.push('')

    lines.push('Medications:')
    if (medications.length === 0) lines.push('- none')
    else
      medications.forEach((m) => {
        const times = (m.times_of_day ?? []).join(', ')
        const food = FOOD_LABELS[m.food_relation] ?? 'any time'
        lines.push(
          `- ${m.name} ${m.dosage_amount}${m.dosage_unit} — ${freqLabel(m)} at ${times} (${food})`
        )
      })

    return lines.join('\n')
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(buildSummary())
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard can be blocked (insecure context / permissions) — no-op for the demo.
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold text-primary"><Eye size={30} /> Caregiver View</h1>
          <p className="mt-1 text-lg text-[var(--color-uncertain-text)]">{shortDate()}</p>
        </div>
        <span className="mt-1 inline-flex shrink-0 items-center gap-2 rounded-full bg-green-50 px-3 py-1 text-base font-semibold text-[var(--color-safe)]">
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-[var(--color-safe)]" />
          Live
        </span>
      </div>

      <Link to="/dashboard" className="mt-3 inline-flex min-h-12 items-center gap-1.5 py-2 text-lg text-primary">
        <ArrowLeft size={20} /> Back to my medicines
      </Link>

      {loading ? (
        <div className="mt-4 h-40 animate-pulse rounded-2xl bg-slate-200" />
      ) : (
        <>
          {/* Adherence hero */}
          <section className="mt-4 rounded-2xl bg-white p-6 shadow-sm">
            {allDone ? (
              <div className="text-2xl font-bold text-[var(--color-safe)]">✓ All taken so far</div>
            ) : (
              <>
                <div className="text-5xl font-bold">
                  {takenCount} <span className="text-[var(--color-uncertain-text)]">of</span> {dueCount}
                </div>
                <div className="mt-1 text-lg text-[var(--color-uncertain-text)]">doses taken today</div>
              </>
            )}
            <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${adherencePercent}%`, backgroundColor: percentColor(adherencePercent) }}
              />
            </div>
          </section>

          {/* Missed doses */}
          {missedDoses.length > 0 && (
            <section className="mt-4 rounded-2xl border-l-4 border-[var(--color-danger)] bg-[#FEF2F2] p-4">
              <h2 className="flex items-center gap-2 text-xl font-bold text-danger"><AlertTriangle size={22} /> Missed doses</h2>
              <ul className="mt-2 flex flex-col gap-1">
                {missedDoses.map((s) => (
                  <li key={`${s.med.id}-${s.scheduledAtISO}`} className="text-lg">
                    {s.med.name} — {s.med.dosage_amount} {s.med.dosage_unit} — was due at {s.timeStr}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Interaction warnings */}
          {activeWarnings.length > 0 && (
            <section className="mt-4">
              <h2 className="mb-2 flex items-center gap-2 text-xl font-bold"><AlertTriangle size={22} /> Interaction warnings ({activeWarnings.length})</h2>
              <div className="flex flex-col gap-2">
                {activeWarnings.map((w) => {
                  const Icon = STATUS_ICON[w.status] ?? HelpCircle
                  const color = STATUS_COLOR[w.status] ?? STATUS_COLOR.uncertain
                  return (
                    <div
                      key={w.id}
                      className="flex items-start gap-3 rounded-2xl border-l-4 bg-surface p-3 shadow-sm"
                      style={{ borderColor: color }}
                    >
                      <Icon size={24} style={{ color }} className="shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold">{w.drug_a} + {w.drug_b}</span>
                          {w.status === 'danger' && !w.acknowledged_at && (
                            <span className="shrink-0 rounded-full bg-danger/10 px-2 py-0.5 text-base font-semibold text-danger">
                              Not acknowledged
                            </span>
                          )}
                        </div>
                        <p className="truncate text-lg text-uncertain-text">{w.headline}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {/* Medication list */}
          <section className="mt-6">
            <h2 className="mb-2 text-xl font-bold">Current medications ({medications.length})</h2>
            {medications.length === 0 ? (
              <p className="text-lg text-[var(--color-uncertain-text)]">No medicines added yet.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {medications.map((m) => (
                  <div key={m.id} className="rounded-xl bg-white p-4 shadow-sm">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                      <span className="text-xl font-bold">{m.name}</span>
                      <span className="text-lg text-[var(--color-uncertain-text)]">
                        {m.dosage_amount} {m.dosage_unit}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-lg text-[var(--color-uncertain-text)]">
                      <span>{freqLabel(m)}</span>
                      <span>·</span>
                      <span>next at {nextDoseLabel(m.times_of_day)}</span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-base text-slate-600">
                        {FOOD_LABELS[m.food_relation] ?? 'any time'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Copy summary */}
          <button
            type="button"
            onClick={handleCopy}
            className="mt-6 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl border-2 border-primary bg-surface px-4 py-3 text-lg font-semibold text-primary"
          >
            {copied ? (<><Check size={20} /> Copied!</>) : (<><Copy size={20} /> Copy summary</>)}
          </button>
        </>
      )}
    </main>
  )
}
