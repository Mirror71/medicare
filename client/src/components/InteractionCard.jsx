const STATUS_CONFIG = {
  danger: {
    border: 'border-l-danger',
    badgeBg: 'bg-danger/10',
    badgeText: 'text-danger',
    label: 'Danger',
  },
  caution: {
    border: 'border-l-caution',
    badgeBg: 'bg-caution/10',
    badgeText: 'text-caution',
    label: 'Caution',
  },
  safe: {
    border: 'border-l-safe',
    badgeBg: 'bg-safe/10',
    badgeText: 'text-safe',
    label: 'Safe',
  },
}

/**
 * Renders a single interaction result. Handles safe/caution/danger.
 * For status === 'uncertain', use <UncertainCard> instead (see InteractionWarnings.jsx).
 *
 * @param {object} interaction - row from the interactions table (snake_case)
 * @param {function} [onAcknowledge] - called with interaction.id; omit to hide the button
 */
export default function InteractionCard({ interaction, onAcknowledge }) {
  const { id, status, drug_a, drug_b, headline, explanation, acknowledged_at } = interaction
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.safe

  // Collapsed "Reviewed" row
  if (acknowledged_at) {
    return (
      <div className="flex items-center justify-between bg-uncertain-text/5 rounded-xl px-4 py-3">
        <span className="text-sm font-medium text-text">{drug_a} + {drug_b}</span>
        <span className="flex items-center gap-1.5 text-sm text-safe font-medium">
          <CheckIcon /> Reviewed
        </span>
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-2xl shadow-sm border-l-[6px] ${config.border} p-4`}>
      <div className="flex items-center gap-2 mb-2">
        <WarnIcon className={config.badgeText} />
        <h3 className="font-bold text-text text-base">{drug_a} + {drug_b}</h3>
      </div>

      <span className={`inline-block ${config.badgeBg} ${config.badgeText} text-xs font-semibold px-3 py-1 rounded-full mb-3`}>
        {config.label}
      </span>

      <p className="font-semibold text-text text-sm mb-1">{headline}</p>
      {explanation && (
        <p className="text-sm text-uncertain-text mb-3 leading-relaxed">{explanation}</p>
      )}

      {onAcknowledge && (
        <div className="flex justify-end">
          <button
            onClick={() => onAcknowledge(id)}
            className="text-sm font-medium text-text border border-uncertain-text/30 rounded-full px-4 py-1.5 active:scale-[0.98] transition-transform"
          >
            Acknowledge
          </button>
        </div>
      )}
    </div>
  )
}

function WarnIcon({ className }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    </svg>
  )
}
function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" className="fill-safe" />
      <path d="M8 12l3 3 5-6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}