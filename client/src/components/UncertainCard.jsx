/**
 * Generic "we couldn't confirm this" card. Reused in two contexts:
 *  - InteractionWarnings.jsx: pass `pair` + `onAcknowledge`
 *  - SideEffectModal.jsx / PhotoCapture.jsx: pass `onRetry`
 *
 * @param {string} [title] - headline text, defaults to a generic message
 * @param {string} [reason] - the uncertaintyReason / explanation from the API
 * @param {{drugA: string, drugB: string}} [pair] - shows a drug-pair heading when present
 * @param {function} [onAcknowledge] - shows an Acknowledge button
 * @param {function} [onRetry] - shows a Retry button
 * @param {string} [retryLabel]
 */
export default function UncertainCard({ title, reason, pair, onAcknowledge, onRetry, retryLabel = 'Try again' }) {
  return (
    <div className="bg-uncertain/5 border border-uncertain/20 rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <InfoIcon />
        {pair && (
          <h3 className="font-bold text-text text-base">{pair.drugA} + {pair.drugB}</h3>
        )}
      </div>

      <span className="inline-block bg-uncertain/10 text-uncertain text-xs font-semibold px-3 py-1 rounded-full mb-3">
        Uncertain
      </span>

      <p className="font-semibold text-text text-sm mb-1">
        {title || "We couldn't confirm this"}
      </p>
      {reason && (
        <p className="text-sm text-uncertain-text mb-3 leading-relaxed">{reason}</p>
      )}

      {(onRetry || onAcknowledge) && (
        <div className="flex justify-end gap-2">
          {onRetry && (
            <button
              onClick={onRetry}
              className="text-sm font-medium text-uncertain border border-uncertain/30 rounded-full px-4 py-1.5 active:scale-[0.98] transition-transform"
            >
              {retryLabel}
            </button>
          )}
          {onAcknowledge && (
            <button
              onClick={onAcknowledge}
              className="text-sm font-medium text-text border border-uncertain-text/30 rounded-full px-4 py-1.5 active:scale-[0.98] transition-transform"
            >
              Acknowledge
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function InfoIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-uncertain">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4M12 8h.01" />
    </svg>
  )
}