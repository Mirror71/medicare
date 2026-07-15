const STATUS = {
  danger:    { icon: '🛑', label: 'Danger',    color: 'var(--color-danger)',    tint: '#FEF2F2' },
  caution:   { icon: '⚠️', label: 'Caution',   color: 'var(--color-caution)',   tint: '#FFFBEB' },
  uncertain: { icon: '❓', label: 'Uncertain', color: 'var(--color-uncertain)', tint: '#EEF2FF' },
  safe:      { icon: '✅', label: 'Safe',       color: 'var(--color-safe)',      tint: '#F0FDF4' },
}

/**
 * Full interaction result card.
 * Props:
 *  - interaction: a row from the interactions table (snake_case)
 *  - acknowledged: boolean (row.acknowledged_at OR locally acknowledged)
 *  - onAcknowledge(): optional callback
 */
export default function InteractionCard({ interaction: i, acknowledged, onAcknowledge }) {
  const s = STATUS[i.status] ?? STATUS.uncertain
  const isUncertain = i.status === 'uncertain' || i.is_uncertain
  const canAcknowledge =
    onAcknowledge && !acknowledged && ['danger', 'caution', 'uncertain'].includes(i.status)

  return (
    <div
      className={
        'rounded-2xl border-l-4 bg-white p-4 shadow-sm ' +
        (isUncertain ? 'border-2 border-dashed border-[var(--color-uncertain)]' : '')
      }
      style={{ borderLeftColor: s.color, backgroundColor: acknowledged ? undefined : s.tint }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl" aria-hidden="true">{s.icon}</span>
          <span className="text-xl font-bold">{i.drug_a} + {i.drug_b}</span>
        </div>
        <span
          className="shrink-0 rounded-full px-3 py-1 text-base font-semibold text-white"
          style={{ backgroundColor: s.color }}
        >
          {s.label}
        </span>
      </div>

      {i.headline && <p className="mt-3 text-lg font-bold">{i.headline}</p>}
      {i.explanation && <p className="mt-1 text-lg text-[var(--color-text)]">{i.explanation}</p>}
      {i.mechanism && (
        <p className="mt-1 text-base text-[var(--color-uncertain-text)]">Why: {i.mechanism}</p>
      )}
      {isUncertain && i.uncertainty_reason && (
        <p className="mt-1 text-base italic text-[var(--color-uncertain-text)]">{i.uncertainty_reason}</p>
      )}
      {i.recommendation && (
        <p className="mt-2 text-lg font-semibold">{i.recommendation}</p>
      )}

      <div className="mt-3 flex items-center justify-between gap-3">
        {i.confidence && (
          <span className="text-base text-[var(--color-uncertain-text)]">
            Confidence: {i.confidence}
          </span>
        )}
        {acknowledged ? (
          <span className="text-base font-semibold text-[var(--color-safe)]">✓ Reviewed</span>
        ) : canAcknowledge ? (
          <button
            type="button"
            onClick={onAcknowledge}
            className="min-h-12 rounded-xl border-2 border-[var(--color-primary)] px-4 text-base font-semibold text-[var(--color-primary)]"
          >
            Mark as reviewed
          </button>
        ) : null}
      </div>
    </div>
  )
}
