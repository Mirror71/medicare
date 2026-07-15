import { useNavigate } from 'react-router-dom'
import { useMedication } from '../store/MedicationContext'

const STEPS = [
  {
    n: 1,
    heading: 'Add your medicines',
    body: 'By photo or by hand — we make it easy.',
  },
  {
    n: 2,
    heading: 'We check every combination',
    body: 'Gemma flags dangerous interactions instantly.',
  },
  {
    n: 3,
    heading: 'You and your caregiver see warnings',
    body: 'Plain language, no medical jargon, updated live.',
  },
]

export default function Landing() {
  const navigate = useNavigate()
  const { medications } = useMedication()
  const hasMeds = medications.length > 0

  return (
    <main className="mx-auto flex max-w-[480px] flex-col px-6 pb-28 pt-12">
      {/* Top section */}
      <div className="text-center">
        <div className="text-6xl leading-none" aria-hidden="true">💊🔍🛡️</div>
        <h1 className="mt-6 text-4xl font-bold text-[var(--color-primary)]">
          MediCare Companion
        </h1>
        <p className="mt-3 text-xl text-[var(--color-uncertain-text)]">
          Your medicines, checked and explained in plain language.
        </p>
      </div>

      {/* How it works */}
      <div className="mt-12 flex flex-col divide-y divide-slate-200">
        {STEPS.map((step) => (
          <div key={step.n} className="flex items-start gap-4 py-5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-[var(--color-primary)] text-xl font-bold text-[var(--color-primary)]">
              {step.n}
            </span>
            <div>
              <h2 className="text-xl font-bold">{step.heading}</h2>
              <p className="mt-1 text-lg text-[var(--color-uncertain-text)]">{step.body}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Primary CTA */}
      <button
        type="button"
        onClick={() => navigate(hasMeds ? '/dashboard' : '/add')}
        className="mt-12 flex h-14 w-full items-center justify-center rounded-xl bg-[var(--color-primary)] text-xl font-semibold text-white"
      >
        {hasMeds ? 'Open my medicines' : 'Get started'}
      </button>

      {/* Secondary link — only when starting fresh */}
      {!hasMeds && (
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="mt-4 min-h-12 text-center text-base text-[var(--color-uncertain-text)] underline"
        >
          Already have medicines saved? Go to dashboard
        </button>
      )}
    </main>
  )
}
