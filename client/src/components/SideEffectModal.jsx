import { useEffect, useState } from 'react'
import { X, Flag, Info } from 'lucide-react'
import { callGemma } from '../lib/apiClient'
import UncertainCard from './UncertainCard'

function EffectItem({ item, redFlag }) {
  return (
    <div
      className={
        'rounded-xl border p-3 ' +
        (redFlag ? 'border-l-4 border-l-[var(--color-danger)] bg-[#FEF2F2]' : 'border-slate-200 bg-white')
      }
    >
      <div className="flex items-center gap-2 text-lg font-semibold">
        {redFlag && <Flag size={18} className="shrink-0 text-danger" />}
        {item.effect}
      </div>
      {item.plainLanguage && (
        <p className="mt-1 text-base text-[var(--color-text)]">{item.plainLanguage}</p>
      )}
      {item.whatToDo && (
        <p className="mt-1 text-base text-[var(--color-uncertain-text)]">
          What to do: {item.whatToDo}
        </p>
      )}
    </div>
  )
}

/**
 * Side-effects modal. Fetches /api/gemma/side-effects for `medicationName`.
 * States: loading → (ok | uncertain | error-as-uncertain).
 * Props: { medicationName, onClose }
 */
export default function SideEffectModal({ medicationName, onClose }) {
  const [phase, setPhase] = useState('loading') // 'loading' | 'ok' | 'uncertain' | 'error'
  const [data, setData] = useState(null)
  const [errorMsg, setErrorMsg] = useState(null)

  useEffect(() => {
    let cancelled = false
    setPhase('loading')
    callGemma('side-effects', { medication: medicationName })
      .then((res) => {
        if (cancelled) return
        setData(res)
        setPhase(res.isUncertain ? 'uncertain' : 'ok')
      })
      .catch((err) => {
        if (cancelled) return
        setErrorMsg(err.message || 'The service is unavailable.')
        setPhase('error')
      })
    return () => { cancelled = true }
  }, [medicationName])

  // Close on Escape.
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Side effects for ${medicationName}`}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-[var(--color-bg)] sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-4">
          <h2 className="text-xl font-bold">Side effects — {medicationName}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-uncertain-text hover:bg-border/40"
          >
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {phase === 'loading' && (
            <div className="flex flex-col items-center gap-3 py-10">
              <span className="h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-[var(--color-primary)]" />
              <span className="text-lg text-[var(--color-uncertain-text)]">Explaining side effects…</span>
            </div>
          )}

          {phase === 'uncertain' && (
            <UncertainCard
              message={data?.reply || `We couldn't confidently explain the side effects of ${medicationName}.`}
              reason={data?.uncertaintyReason}
              recommendation={data?.recommendation || 'Please check with your doctor or pharmacist.'}
            />
          )}

          {phase === 'error' && (
            <UncertainCard
              title="We couldn't load this right now"
              message={`We weren't able to explain the side effects of ${medicationName} at the moment.`}
              reason={errorMsg}
              recommendation="Please try again later, or ask your pharmacist."
            />
          )}

          {phase === 'ok' && data && (
            <div className="flex flex-col gap-4">
              {data.summary && <p className="text-lg">{data.summary}</p>}

              {data.common?.length > 0 && (
                <section>
                  <h3 className="mb-2 text-lg font-bold">Common effects</h3>
                  <div className="flex flex-col gap-2">
                    {data.common.map((item, idx) => (
                      <EffectItem key={idx} item={item} />
                    ))}
                  </div>
                </section>
              )}

              {data.serious?.length > 0 && (
                <section>
                  <h3 className="mb-2 text-lg font-bold text-[var(--color-danger)]">Serious effects — seek help</h3>
                  <div className="flex flex-col gap-2">
                    {data.serious.map((item, idx) => (
                      <EffectItem key={idx} item={item} redFlag />
                    ))}
                  </div>
                </section>
              )}

              {data.whenToSeekHelp && (
                <p className="rounded-xl bg-[#FEF2F2] px-4 py-3 text-lg font-semibold text-[var(--color-danger)]">
                  {data.whenToSeekHelp}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer disclaimer */}
        <div className="flex items-center justify-center gap-2 border-t border-border bg-surface px-4 py-3 text-center text-base text-uncertain-text">
          <Info size={18} className="shrink-0" />
          <span>Informational only — not medical advice. Always check with your doctor or pharmacist.</span>
        </div>
      </div>
    </div>
  )
}
