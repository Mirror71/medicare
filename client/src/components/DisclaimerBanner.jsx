import { Info } from 'lucide-react'

export default function DisclaimerBanner({ raised = false }) {
  return (
    <footer
      role="note"
      className={
        'fixed left-0 right-0 z-40 flex items-center justify-center gap-2 border-t border-border bg-bg/95 px-4 text-center text-base text-uncertain-text backdrop-blur-sm ' +
        (raised
          ? 'bottom-[calc(5rem+env(safe-area-inset-bottom))] py-3'
          : 'bottom-0 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]')
      }
    >
      <Info size={18} className="shrink-0" />
      <span>Informational only — not medical advice. Always check with your doctor or pharmacist.</span>
    </footer>
  )
}
