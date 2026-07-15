# MediCare Companion — Frontend Status

_Last updated: 2026-07-15_

A snapshot of what the frontend does today, what's still on mock data, and the UI
work that hasn't been applied yet. Legend: ✅ done · 🟡 partial / mock · ⛔ not built.

---

## 1. Stack & structure

- **React + Vite + Tailwind CSS v4** (v4 `@theme` tokens in `src/index.css` — no
  `tailwind.config.js`, no PostCSS config).
- **State:** `MedicationContext` (React context + reducer) with **Supabase Realtime**
  subscriptions. Data shape is **flat snake_case** (`dosage_amount`, `times_of_day`,
  `food_relation`, `start_date`, `ongoing`, `source_photo_id`, …).
- **API client:** `src/lib/apiClient.js` → `callGemma(type, payload)` hitting the
  Express server at `/api/gemma/*`.
- **Routes:** `/`, `/add`, `/edit/:id`, `/dashboard`, `/dashboard/interactions`,
  `/caregiver`, `/chat`.

### Design tokens (from `src/index.css`)

| Token | Value | Meaning |
|---|---|---|
| `--color-bg` | `#F8FAFC` | page background |
| `--color-text` | `#0F172A` | primary text |
| `--color-primary` | `#0369A1` | brand / primary actions / links |
| `--color-safe` | `#15803D` | safe / taken / success |
| `--color-caution` | `#B45309` | caution |
| `--color-danger` | `#B91C1C` | danger / destructive |
| `--color-uncertain` | `#6366F1` | uncertain |
| `--color-uncertain-text` | `#475569` | muted secondary text |

---

## 2. Screens & components — build status

| Screen / component | File | Status | Notes |
|---|---|---|---|
| Landing | `pages/Landing.jsx` | ✅ | Context-aware CTA ("Get started" vs "Open my medicines") |
| Dashboard | `pages/Dashboard.jsx` | ✅ | Live Supabase; time-grouped dose cards, adherence, warning strip, empty/loading/all-done states |
| Dose card | `components/MedCard.jsx` | ✅ | Taken toggle, overdue badge, overflow menu |
| Add / Edit form | `pages/AddEditMedication.jsx` | ✅ | Live Supabase save/edit; validation; all form states |
| Photo capture | `components/PhotoCapture.jsx` | 🟡 | UI + canvas downscale done; **still uses mock, not the real API** (see §3) |
| Interaction warnings | `pages/InteractionWarnings.jsx` | ✅ | Real pairwise checks via API; merge-with-local so it works even if Realtime is off |
| Interaction card | `components/InteractionCard.jsx` | ✅ | Status colors, acknowledge |
| Uncertain card | `components/UncertainCard.jsx` | ✅ | Reused by modal + interactions |
| Side-effects modal | `components/SideEffectModal.jsx` | ✅ | Real API; loading / ok / uncertain / error states |
| Caregiver view | `pages/CaregiverView.jsx` | ✅ | Read-only; adherence, missed, warnings, med list, copy-summary |
| Symptom chat | `pages/SymptomChat.jsx` | 🟡 | Full UI; **mock responses only, not the real API** (see §3) |
| Bottom navigation | `components/BottomNav.jsx` | ✅ | 5 sections; hidden on focused task screens |
| Disclaimer banner | `components/DisclaimerBanner.jsx` | ✅ | Pinned every route; sits above nav when nav is visible |
| Notifications hook | `hooks/useNotifications.js` | ✅ | Permission + due-dose reminders + missedDoses |

---

## 3. API wiring status (frontend → Gemma)

The server + Gemma 4 (`gemma-4-31b-it`) work; **all four endpoints are verified.**
But two client features are **not yet wired** to them:

| Feature | Endpoint | Wired? |
|---|---|---|
| Interaction check | `POST /api/gemma/interaction` | ✅ real |
| Side effects | `POST /api/gemma/side-effects` | ✅ real |
| **Photo ID** | `POST /api/gemma/photo-id` | ⛔ **mock** — `PhotoCapture` still does a 2s `setTimeout` and fills the hardcoded "Proris" data instead of calling the endpoint |
| **Symptom chat** | `POST /api/gemma/symptom` | ⛔ **mock** — `SymptomChat` rotates through 3 hardcoded responses instead of calling the endpoint |

> Both endpoints are proven working end-to-end (photo-id read a test image
> correctly; symptom returned a correct clinical read). Wiring each is a small swap
> of the mock for a `callGemma(...)` call plus loading/error handling.
cd
---

## 4. UI / design work NOT done yet

### 4a. Section-by-section redesign (pending)
A full visual design spec exists (calm clinical look, larger type, bottom sheets,
adherence circles, etc.) but **has not been applied**. The current UI is functional
and consistent but not yet polished to that spec. Highest-impact screens to redesign
first: **Dashboard**, then the **bottom nav**.

### 4b. Specific UI items still open
- **Bottom nav — elevated Add button vs disclaimer conflict.** The design wants an
  elevated 64px center "Add" FAB, but the disclaimer sits directly above the nav, so
  the FAB would overlap it. Currently Add is a **flat accent cell** to avoid this.
  Needs a deliberate decision (raise disclaimer, or keep flat).
- **Nav label size.** Labels are `text-sm` (~15.75px) — one hair under the 16px floor.
  Bump to 16px.
- **Overflow menu is a dropdown popover**, not a mobile bottom sheet. Design calls for
  a bottom sheet on small screens.
- **Notification badge on "Alerts"** not implemented (would need to bind to
  `activeWarnings.length`).
- **Adherence display** is a progress bar; Caregiver design asks for an adherence
  **circle**. Not done.
- **"Reviewed" interaction cards** don't collapse to a summary yet.
- **Safe-area inset** (`env(safe-area-inset-bottom)`) not applied to the nav — needed
  for iPhone home-indicator spacing.
- **Delight touches** (green fade on "taken", tab scale, fade-ins) mostly not added.
  Exception: Caregiver "Copy summary → ✓ Copied!" already exists.

### 4c. Design-spec traps to AVOID when implementing
When applying any external (e.g. ChatGPT) design, do **not** implement these literally:
- **Locked copy** — keep the exact disclaimer `ℹ️ Informational only — not medical
  advice. Always check with your doctor or pharmacist.` and the exact landing tagline
  "Your medicines, checked and explained in plain language." Do not reword.
- **Food-relation control** must use the four real values `before_food`, `with_food`,
  `after_food`, `no_preference` — not "Breakfast / With food / Without food".
- **Invented states with no backend** — ignore Offline / Syncing, "No caregiver
  linked", chat **microphone**, chat **streaming**. None of these exist in the app.

---

## 5. Verification status

- ✅ **Production build** clean (`vite build`, ~101 modules).
- ✅ **Data layer** verified against live Supabase (medications + dose_log + interactions
  insert/update/delete round-trips) and live Gemma endpoints.
- ⛔ **No in-browser click-through** has been done by the dev tooling. Layout at 375px,
  the toggles, modal open/close, bottom-nav stacking, and cross-tab Realtime updates
  have **not** been eyeballed. This is the main remaining verification gap and needs a
  human at `localhost:5173`.
- ⚠️ **Supabase Realtime** must be enabled on `medications` / `dose_log` /
  `interactions` for live updates (the caregiver "live" demo depends on it).

---

## 6. Suggested next steps (in order)

1. Wire **Photo capture** → `/api/gemma/photo-id` (replace mock).
2. Wire **Symptom chat** → `/api/gemma/symptom` (replace mock).
3. Decide the **elevated-Add vs disclaimer** layout question, then redesign the
   **Dashboard** and **nav** to the visual spec.
4. Do a real **browser pass at 375px** and confirm Realtime is on.
5. Add a **README** + `.env.example` (client & server) so the repo is runnable by
   others (currently missing).







