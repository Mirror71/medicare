export default function DisclaimerBanner({ raised = false }) {
  return (
    <footer
      role="note"
      className={
        'fixed left-0 right-0 z-40 border-t border-slate-200 bg-white/95 px-4 py-3 text-center text-base text-[var(--color-uncertain-text)] backdrop-blur ' +
        (raised ? 'bottom-16' : 'bottom-0')
      }
    >
      ℹ️ Informational only — not medical advice. Always check with your doctor or pharmacist.
    </footer>
  )
}
