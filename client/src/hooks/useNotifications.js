import { useEffect, useMemo, useRef, useState } from 'react'

const hasNotificationApi = () => typeof window !== 'undefined' && 'Notification' in window

/**
 * useNotifications(slots)
 *
 * `slots` is a flat array of today's dose slots (as produced by MedicationContext's
 * todaysSchedule), each: { med, timeStr, scheduledAt: Date, scheduledAtISO, taken }.
 *
 * - Requests Notification permission once (respects a prior grant/deny).
 * - Every 60s, fires a reminder for any un-taken dose due within the next 5 minutes.
 * - Exposes `missedDoses`: un-taken slots more than 60 minutes past due (today only).
 */
export function useNotifications(slots = []) {
  const [permission, setPermission] = useState(
    hasNotificationApi() ? Notification.permission : 'denied'
  )

  // Keep the latest slots reachable from the interval without re-arming it.
  const slotsRef = useRef(slots)
  slotsRef.current = slots

  // Remember which slots we've already notified about, so we don't repeat.
  const firedRef = useRef(new Set())

  // ── Request permission once ──────────────────────────────────────────────
  useEffect(() => {
    if (!hasNotificationApi()) return
    if (Notification.permission === 'default') {
      // Browsers show their own prompt; we simply ask once and respect the answer.
      Notification.requestPermission().then((p) => setPermission(p)).catch(() => {})
    }
  }, [])

  // ── Reminder poll ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!hasNotificationApi()) return

    const check = () => {
      if (Notification.permission !== 'granted') return
      const now = Date.now()
      const soon = now + 5 * 60 * 1000

      for (const s of slotsRef.current) {
        if (s.taken) continue
        const t =
          s.scheduledAt instanceof Date
            ? s.scheduledAt.getTime()
            : new Date(s.scheduledAt).getTime()
        if (t >= now && t <= soon && !firedRef.current.has(s.scheduledAtISO)) {
          firedRef.current.add(s.scheduledAtISO)
          const dosage = `${s.med.dosage_amount} ${s.med.dosage_unit}`
          try {
            new Notification(`Time to take ${s.med.name} (${dosage})`)
          } catch {
            // Some environments throw if constructed outside a user gesture — ignore.
          }
        }
      }
    }

    check()
    const id = setInterval(check, 60_000)
    return () => clearInterval(id)
  }, [])

  // ── Missed doses (also consumed by CaregiverView) ────────────────────────
  const missedDoses = useMemo(() => {
    const cutoff = Date.now() - 60 * 60 * 1000
    return slots.filter((s) => {
      if (s.taken) return false
      const t =
        s.scheduledAt instanceof Date
          ? s.scheduledAt.getTime()
          : new Date(s.scheduledAt).getTime()
      return t < cutoff
    })
  }, [slots])

  return { permission, missedDoses }
}
