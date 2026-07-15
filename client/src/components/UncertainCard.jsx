/**
 * A calm "we're not sure" card used wherever a result is uncertain or could not
 * be produced. Indigo dashed border, no alarm — just honesty.
 */
export default function UncertainCard({ title = "We're not sure about this", message, reason, recommendation }) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-[var(--color-uncertain)] bg-white p-4">
      <div className="flex items-center gap-2 text-xl font-bold text-[var(--color-uncertain-text)]">
        <span aria-hidden="true">❓</span>
        {title}
      </div>
      {message && <p className="mt-2 text-lg text-[var(--color-text)]">{message}</p>}
      {reason && (
        <p className="mt-2 text-base italic text-[var(--color-uncertain-text)]">{reason}</p>
      )}
      {recommendation && (
        <p className="mt-2 text-lg font-semibold text-[var(--color-text)]">{recommendation}</p>
      )}
    </div>
  )
}
