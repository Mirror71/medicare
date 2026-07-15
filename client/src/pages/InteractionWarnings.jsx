import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useMedication, PATIENT_ID } from '../store/MedicationContext'
import { supabase } from '../lib/supabase'
import { callGemma } from '../lib/apiClient'
import InteractionCard from '../components/InteractionCard'

const SEVERITY_RANK = { danger: 0, caution: 1, uncertain: 2, safe: 3 }

// Order-insensitive key so "A+B" and "B+A" are the same pair.
function pairKey(a, b) {
  return [String(a).trim().toLowerCase(), String(b).trim().toLowerCase()].sort().join('||')
}

// Map the /api/gemma/interaction response → an interactions table row.
function toRow(data, a, b) {
  return {
    patient_id: PATIENT_ID,
    drug_a: data.pair?.drugA ?? a,
    drug_b: data.pair?.drugB ?? b,
    status: data.status ?? 'uncertain',
    severity: data.severity ?? 'unknown',
    headline: data.headline ?? '',
    explanation: data.explanation ?? '',
    mechanism: data.mechanism ?? null,
    recommendation: data.recommendation ?? '',
    confidence: data.confidence ?? 'low',
    is_uncertain: data.isUncertain ?? true,
    uncertainty_reason: data.uncertaintyReason ?? null,
  }
}

export default function InteractionWarnings() {
  const { medications, interactions, loading, acknowledgeInteraction } = useMedication()
  const [searchParams] = useSearchParams()
  const focusId = searchParams.get('focus')

  // Rows inserted this session — merged with context so results show even if
  // Realtime isn't enabled on the interactions table.
  const [localRows, setLocalRows] = useState([])
  const [ackedIds, setAckedIds] = useState(() => new Set())
  const [checking, setChecking] = useState(false)
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [checkError, setCheckError] = useState(null)
  const autoRan = useRef(false)

  // Merge context + local rows, context winning (it carries real id / ack state).
  const allInteractions = useMemo(() => {
    const byPair = new Map()
    for (const r of interactions) byPair.set(pairKey(r.drug_a, r.drug_b), r)
    for (const r of localRows) {
      const k = pairKey(r.drug_a, r.drug_b)
      if (!byPair.has(k)) byPair.set(k, r)
    }
    return [...byPair.values()].sort(
      (x, y) => (SEVERITY_RANK[x.status] ?? 9) - (SEVERITY_RANK[y.status] ?? 9)
    )
  }, [interactions, localRows])

  const existingPairs = useMemo(
    () => new Set(allInteractions.map((r) => pairKey(r.drug_a, r.drug_b))),
    [allInteractions]
  )

  // Check a list of [a, b] name pairs, skipping ones already known.
  async function runChecks(pairs) {
    const todo = pairs.filter(([a, b]) => !existingPairs.has(pairKey(a, b)))
    if (todo.length === 0) return
    setChecking(true)
    setCheckError(null)
    setProgress({ done: 0, total: todo.length })
    for (let idx = 0; idx < todo.length; idx++) {
      const [a, b] = todo[idx]
      try {
        const data = await callGemma('interaction', { drugA: a, drugB: b })
        const row = toRow(data, a, b)
        const { data: inserted, error } = await supabase
          .from('interactions')
          .insert(row)
          .select()
          .single()
        if (error) throw error
        setLocalRows((prev) => [...prev, inserted])
      } catch (err) {
        setCheckError(err.message || 'A check could not be completed.')
      }
      setProgress({ done: idx + 1, total: todo.length })
    }
    setChecking(false)
  }

  function checkAll() {
    const names = medications.map((m) => m.name).filter(Boolean)
    const pairs = []
    for (let i = 0; i < names.length; i++)
      for (let j = i + 1; j < names.length; j++) pairs.push([names[i], names[j]])
    runChecks(pairs)
  }

  // Auto-check pairs involving a focused medication (from the MedCard menu).
  useEffect(() => {
    if (loading || autoRan.current || !focusId) return
    const med = medications.find((m) => m.id === focusId)
    if (!med) return
    autoRan.current = true
    const pairs = medications
      .filter((m) => m.id !== med.id && m.name)
      .map((m) => [med.name, m.name])
    runChecks(pairs)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, focusId, medications])

  async function handleAcknowledge(row) {
    setAckedIds((prev) => new Set(prev).add(row.id)) // optimistic
    try {
      await acknowledgeInteraction(row.id)
    } catch {
      // Leave the optimistic state; the row is still visibly reviewed for the demo.
    }
  }

  const isAcked = (row) => Boolean(row.acknowledged_at) || ackedIds.has(row.id)
  const canCheck = medications.length >= 2

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <Link to="/dashboard" className="inline-block min-h-12 py-2 text-lg text-[var(--color-primary)] underline">
        ← Back to my medicines
      </Link>

      <h1 className="mt-2 text-3xl font-bold text-[var(--color-primary)]">Interaction warnings</h1>

      {/* Check control */}
      <div className="mt-4">
        {checking ? (
          <div className="flex items-center gap-3 rounded-xl bg-white px-4 py-3 shadow-sm">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-[var(--color-primary)]" />
            <span className="text-lg">Checking interactions… {progress.done}/{progress.total}</span>
          </div>
        ) : (
          <button
            type="button"
            onClick={checkAll}
            disabled={!canCheck}
            className="min-h-12 w-full rounded-xl bg-[var(--color-primary)] px-4 text-lg font-semibold text-white disabled:opacity-50"
          >
            Check all my medicines
          </button>
        )}
        {!canCheck && (
          <p className="mt-2 text-base text-[var(--color-uncertain-text)]">
            Add at least two medicines to check for interactions.
          </p>
        )}
        {checkError && (
          <p className="mt-2 text-base text-[var(--color-danger)]">{checkError}</p>
        )}
      </div>

      {/* Results */}
      <div className="mt-5 flex flex-col gap-3 pb-8">
        {loading ? (
          <div className="h-32 animate-pulse rounded-2xl bg-slate-200" />
        ) : allInteractions.length === 0 ? (
          <p className="mt-8 text-center text-lg text-[var(--color-uncertain-text)]">
            No interaction checks yet.
          </p>
        ) : (
          <>
            {/* Active warnings */}
            {allInteractions.filter((r) => !isAcked(r)).map((row) => (
              <InteractionCard
                key={row.id ?? pairKey(row.drug_a, row.drug_b)}
                interaction={row}
                acknowledged={false}
                onAcknowledge={row.id ? () => handleAcknowledge(row) : undefined}
              />
            ))}

            {/* Past warnings */}
            {allInteractions.some((r) => isAcked(r)) && (
              <div className="mt-4">
                <h2 className="mb-2 text-lg font-semibold text-slate-400">Past warnings</h2>
                <div className="flex flex-col gap-3 opacity-60">
                  {allInteractions.filter((r) => isAcked(r)).map((row) => (
                    <InteractionCard
                      key={row.id ?? pairKey(row.drug_a, row.drug_b)}
                      interaction={row}
                      acknowledged={true}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  )
}
