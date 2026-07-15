import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMedication } from "../store/MedicationContext";
import PhotoCapture from "../components/PhotoCapture";
import { Camera, X } from "lucide-react";
import { callGemma } from "../lib/apiClient";

// ─── Options ────────────────────────────────────────────────────────────────
const UNITS = [
  "mg",
  "mcg",
  "g",
  "ml",
  "IU",
  "tablet",
  "capsule",
  "drop",
  "puff",
];

const FOOD_OPTIONS = [
  { value: "before_food", label: "Before food" },
  { value: "with_food", label: "With food" },
  { value: "after_food", label: "After food" },
  { value: "no_preference", label: "No preference" },
];

const NOTES_MAX = 500;

// ─── Helpers ────────────────────────────────────────────────────────────────
function todayStr() {
  return new Date().toISOString().split("T")[0];
}

// Sensible default spread of dose times for a given count.
function defaultSpread(n) {
  const presets = {
    1: ["08:00"],
    2: ["08:00", "20:00"],
    3: ["08:00", "14:00", "20:00"],
  };
  if (presets[n]) return presets[n];
  const start = 8;
  const end = 22;
  const step = n > 1 ? (end - start) / (n - 1) : 0;
  return Array.from({ length: n }, (_, i) => {
    const h = Math.round(start + step * i);
    return `${String(h).padStart(2, "0")}:00`;
  });
}

// Resize the times array to `n`, keeping any values the user already entered.
function resizeTimes(prev, n) {
  const spread = defaultSpread(n);
  return Array.from({ length: n }, (_, i) => prev[i] ?? spread[i]);
}

const EMPTY = {
  name: "",
  genericName: "",
  dosageAmount: "",
  dosageUnit: "mg",
  timesPerDay: 1,
  times: ["08:00"],
  foodRelation: "no_preference",
  startDate: todayStr(),
  ongoing: true,
  endDate: "",
  notes: "",
};

// Map a flat medication row (snake_case, as stored in Supabase) → form state.
function rowToForm(m) {
  const timesPerDay = m.times_per_day ?? (m.times_of_day?.length || 1);
  return {
    name: m.name ?? "",
    genericName: m.generic_name ?? "",
    dosageAmount: m.dosage_amount != null ? String(m.dosage_amount) : "",
    dosageUnit: m.dosage_unit ?? "mg",
    timesPerDay,
    times:
      Array.isArray(m.times_of_day) && m.times_of_day.length
        ? m.times_of_day
        : defaultSpread(timesPerDay),
    foodRelation: m.food_relation ?? "no_preference",
    startDate: m.start_date ?? todayStr(),
    ongoing: m.ongoing ?? m.end_date == null,
    endDate: m.end_date ?? "",
    notes: m.notes ?? "",
  };
}

// ─── Component ──────────────────────────────────────────────────────────────
export default function AddEditMedication() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { medications, loading, addMedication, updateMedication } =
    useMedication();

  const isEdit = Boolean(id);

  const [form, setForm] = useState(EMPTY);
  const [touched, setTouched] = useState({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  // Banner state: 'normal' | 'photo_processing' | 'photo_prefilled' | 'photo_uncertain'
  const [photoState, setPhotoState] = useState("normal");
  const [prefilledFields, setPrefilledFields] = useState(() => new Set());
  const [showCapture, setShowCapture] = useState(false);
  const [sourcePhotoId, setSourcePhotoId] = useState(null);
  const set = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    // Typing in any field dismisses the "couldn't read" notice.
    if (photoState === "photo_uncertain") setPhotoState("normal");
  };
  const markTouched = (key) => setTouched((t) => ({ ...t, [key]: true }));

  // ── Load existing med for edit ─────────────────────────────────────────────
  useEffect(() => {
    if (!isEdit) return;
    if (loading) return;
    const med = medications.find((m) => m.id === id);
    if (!med) {
      navigate("/dashboard", { replace: true });
      return;
    }
    setForm(rowToForm(med));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, id, loading, medications]);

  // ── Frequency → time pickers ───────────────────────────────────────────────
  function handleTimesPerDay(raw) {
    const n = Math.max(1, Math.min(10, Number(raw) || 1));
    setForm((f) => ({ ...f, timesPerDay: n, times: resizeTimes(f.times, n) }));
  }

  function handleTimeChange(i, value) {
    setForm((f) => {
      const times = [...f.times];
      times[i] = value;
      return { ...f, times };
    });
  }

  // ── Photo prefill ──────────────────────────────────────────────────────────
  // Given parsed photo data, fill the form and switch to the "please check these"
  // visual state. No auto-save — the user must review and tap Save.
  function prefillFromPhoto(data) {
    if (!data || data.readable === false) {
      setForm(EMPTY);
      setPrefilledFields(new Set());
      setSourcePhotoId(null);
      setPhotoState("photo_uncertain");
      return;
    }
    const filled = new Set();
    setForm((f) => {
      const next = { ...f };
      if (data.name != null) {
        next.name = data.name;
        filled.add("name");
      }
      if (data.activeIngredient != null) {
        next.genericName = data.activeIngredient;
        filled.add("genericName");
      }
      if (data.dosageAmount != null) {
        next.dosageAmount = String(data.dosageAmount);
        filled.add("dosageAmount");
      }
      if (data.dosageUnit != null) {
        next.dosageUnit = data.dosageUnit;
        filled.add("dosageUnit");
      }
      if (data.frequencyText) {
        const m = String(data.frequencyText).match(/\d+/);
        if (m) {
          const n = Math.max(1, Math.min(10, Number(m[0])));
          next.timesPerDay = n;
          next.times = resizeTimes(f.times, n);
          filled.add("timesPerDay");
        }
      }
      return next;
    });
    setPrefilledFields(filled);
    setSourcePhotoId(`photo_${Date.now()}`);
    setPhotoState("photo_prefilled");
  }

  // ── Photo capture wiring ────────────────────────────────────────────────────
  async function handleCaptureComplete({ imageBase64, mimeType }) {
    setShowCapture(false);
    setPhotoState("photo_processing");
    try {
      const data = await callGemma("photo-id", { imageBase64, mimeType });
      prefillFromPhoto(data);
    } catch {
      prefillFromPhoto(null); // triggers the "couldn't read" uncertain banner
    }
  }

  // ── Validation ─────────────────────────────────────────────────────────────
  const errors = useMemo(() => {
    const e = {};
    if (!form.name.trim()) e.name = "Medicine name is required";

    if (form.dosageAmount === "" || form.dosageAmount == null) {
      e.dosageAmount = "Dose is required";
    } else if (Number(form.dosageAmount) <= 0) {
      e.dosageAmount = "Dose must be greater than 0";
    }

    if (!form.dosageUnit) e.dosageUnit = "Please select a unit";

    if (!form.ongoing && form.endDate && form.endDate < form.startDate) {
      e.endDate = "End date must be after start date";
    }
    return e;
  }, [form]);

  const isValid = Object.keys(errors).length === 0;
  const showError = (key) =>
    (touched[key] || submitAttempted) && errors[key] ? errors[key] : null;

  // ── Save ───────────────────────────────────────────────────────────────────
  async function handleSave() {
    setSubmitAttempted(true);
    if (!isValid || saving) return;

    const timesPerDay = Number(form.timesPerDay);
    const row = {
      name: form.name.trim(),
      generic_name: form.genericName.trim() || null,
      dosage_amount: Number(form.dosageAmount),
      dosage_unit: form.dosageUnit,
      times_per_day: timesPerDay,
      interval_hours: Math.floor(24 / timesPerDay),
      days_of_week: null,
      times_of_day: form.times.slice(0, timesPerDay),
      food_relation: form.foodRelation,
      start_date: form.startDate,
      end_date: form.ongoing ? null : form.endDate || null,
      ongoing: form.ongoing,
      notes: form.notes.trim() || null,
      source_photo_id: sourcePhotoId,
    };

    setSaving(true);
    setSaveError(null);
    try {
      if (isEdit) {
        await updateMedication(id, row);
      } else {
        await addMedication(row);
      }
      navigate("/dashboard");
    } catch (err) {
      setSaveError(err.message || "Could not save. Please try again.");
      setSaving(false);
    }
  }

  // ── Styles ─────────────────────────────────────────────────────────────────
  const inputBase =
    "w-full min-h-12 rounded-xl border border-slate-300 bg-white px-4 text-lg " +
    "outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/30 " +
    "disabled:opacity-60";
  const labelBase = "mb-1 block text-lg font-semibold";
  const fieldCls = (key) =>
    `${inputBase} ${prefilledFields.has(key) ? "border-[#BFDBFE] bg-[#EFF6FF]" : ""}`;

  const disabled = saving || photoState === "photo_processing" || showCapture;
  const formDimmed = showCapture || photoState === "photo_processing";

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="mb-6 text-3xl font-bold text-[var(--color-primary)]">
        {isEdit ? "Edit medication" : "Add medication"}
      </h1>

      {/* Photo banners */}
      {photoState === "photo_processing" && (
        <div className="mb-5 flex items-center gap-3 rounded-xl border-l-4 border-[var(--color-primary)] bg-[#EFF6FF] px-4 py-3 font-semibold text-[var(--color-primary)]">
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--color-primary)]/30 border-t-[var(--color-primary)]" />
          Reading your medicine…
        </div>
      )}
      {photoState === "photo_prefilled" && (
        <div className="mb-5 flex items-start gap-2 rounded-2xl border-l-4 border-primary bg-primary/10 px-4 py-3 text-text">
          <Camera size={20} className="mt-0.5 shrink-0 text-primary" />
          <span>We read these from your photo — please check and correct anything that's wrong.</span>
        </div>
      )}
      {photoState === "photo_uncertain" && (
        <div className="mb-5 flex items-start justify-between gap-3 rounded-2xl border-l-4 border-caution bg-caution/10 px-4 py-3 text-caution">
          <span className="flex items-start gap-2">
            <Camera size={20} className="mt-0.5 shrink-0" />
            We couldn't read this clearly — please enter the details yourself.
          </span>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => setPhotoState("normal")}
            className="flex h-8 w-8 shrink-0 items-center justify-center text-caution"
          >
            <X size={20} />
          </button>
        </div>
      )}

      {/* Add by photo — new meds only. Tapping swaps in the capture UI inline. */}
      {!isEdit &&
        photoState !== "photo_processing" &&
        (showCapture ? (
          <PhotoCapture
            onCaptureComplete={handleCaptureComplete}
            onCancel={() => setShowCapture(false)}
          />
        ) : (
          <button
            type="button"
            disabled={disabled}
            className="mb-6 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-primary bg-surface px-4 py-3 text-lg font-semibold text-primary disabled:opacity-60"
            onClick={() => setShowCapture(true)}
          >
            <Camera size={22} /> Add by photo
          </button>
        ))}

      <form
        className={`flex flex-col gap-5 transition-opacity ${formDimmed ? "opacity-50" : ""}`}
        onSubmit={(e) => {
          e.preventDefault();
          handleSave();
        }}
      >
        {/* Name */}
        <div>
          <label htmlFor="name" className={labelBase}>
            Medicine name
          </label>
          <input
            id="name"
            type="text"
            value={form.name}
            disabled={disabled}
            placeholder="e.g. Warfarin, Paracetamol"
            className={fieldCls("name")}
            onChange={(e) => set("name", e.target.value)}
            onBlur={() => markTouched("name")}
          />
          {showError("name") && (
            <p className="mt-1 text-base text-[var(--color-danger)]">
              {showError("name")}
            </p>
          )}
        </div>

        {/* Active ingredient */}
        <div>
          <label htmlFor="genericName" className={labelBase}>
            Active ingredient (optional)
          </label>
          <input
            id="genericName"
            type="text"
            value={form.genericName}
            disabled={disabled}
            placeholder="e.g. warfarin sodium"
            className={fieldCls("genericName")}
            onChange={(e) => set("genericName", e.target.value)}
          />
        </div>

        {/* Dosage */}
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="sm:flex-1">
            <label htmlFor="dosageAmount" className={labelBase}>
              Dose
            </label>
            <input
              id="dosageAmount"
              type="number"
              min="0"
              step="any"
              inputMode="decimal"
              value={form.dosageAmount}
              disabled={disabled}
              placeholder="e.g. 5"
              className={fieldCls("dosageAmount")}
              onChange={(e) => set("dosageAmount", e.target.value)}
              onBlur={() => markTouched("dosageAmount")}
            />
            {showError("dosageAmount") && (
              <p className="mt-1 text-base text-[var(--color-danger)]">
                {showError("dosageAmount")}
              </p>
            )}
          </div>
          <div className="sm:w-44">
            <label htmlFor="dosageUnit" className={labelBase}>
              Unit
            </label>
            <select
              id="dosageUnit"
              value={form.dosageUnit}
              disabled={disabled}
              className={fieldCls("dosageUnit")}
              onChange={(e) => set("dosageUnit", e.target.value)}
              onBlur={() => markTouched("dosageUnit")}
            >
              {UNITS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
            {showError("dosageUnit") && (
              <p className="mt-1 text-base text-[var(--color-danger)]">
                {showError("dosageUnit")}
              </p>
            )}
          </div>
        </div>

        {/* Frequency */}
        <div>
          <label htmlFor="timesPerDay" className={labelBase}>
            Times per day
          </label>
          <input
            id="timesPerDay"
            type="number"
            min="1"
            max="10"
            value={form.timesPerDay}
            disabled={disabled}
            className={fieldCls("timesPerDay")}
            onChange={(e) => handleTimesPerDay(e.target.value)}
          />
        </div>

        {/* Times of day */}
        <div className="flex flex-col gap-3">
          {form.times.map((t, i) => (
            <div key={i}>
              <label htmlFor={`time-${i}`} className={labelBase}>
                Dose {i + 1} time
              </label>
              <input
                id={`time-${i}`}
                type="time"
                value={t}
                disabled={disabled}
                className={inputBase}
                onChange={(e) => handleTimeChange(i, e.target.value)}
              />
            </div>
          ))}
        </div>

        {/* Food relation */}
        <div>
          <span className={labelBase}>When to take</span>
          <div className="flex flex-wrap gap-0 overflow-hidden rounded-xl border-2 border-[var(--color-primary)]">
            {FOOD_OPTIONS.map((opt, idx) => {
              const active = form.foodRelation === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  disabled={disabled}
                  aria-pressed={active}
                  className={
                    "flex-1 min-w-[45%] px-3 py-3 text-base font-semibold transition-colors sm:min-w-0 " +
                    (idx > 0 ? "border-l border-[var(--color-primary)] " : "") +
                    (active
                      ? "bg-[var(--color-primary)] text-white"
                      : "bg-white text-[var(--color-primary)]")
                  }
                  onClick={() => set("foodRelation", opt.value)}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Duration */}
        <div className="flex flex-col gap-4">
          <div>
            <label htmlFor="startDate" className={labelBase}>
              Start date
            </label>
            <input
              id="startDate"
              type="date"
              value={form.startDate}
              disabled={disabled}
              className={inputBase}
              onChange={(e) => set("startDate", e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between gap-4">
            <span className="text-lg font-semibold">Ongoing</span>
            <button
              type="button"
              role="switch"
              aria-checked={form.ongoing}
              aria-label="Ongoing"
              disabled={disabled}
              onClick={() => set("ongoing", !form.ongoing)}
              className="flex h-12 w-14 shrink-0 items-center justify-center disabled:opacity-60"
            >
              <span
                className={
                  "relative h-8 w-14 rounded-full transition-colors " +
                  (form.ongoing ? "bg-[var(--color-safe)]" : "bg-slate-300")
                }
              >
                <span
                  className={
                    "absolute top-1 h-6 w-6 rounded-full bg-white transition-all " +
                    (form.ongoing ? "left-7" : "left-1")
                  }
                />
              </span>
            </button>
          </div>

          {!form.ongoing && (
            <div>
              <label htmlFor="endDate" className={labelBase}>
                End date
              </label>
              <input
                id="endDate"
                type="date"
                value={form.endDate}
                min={form.startDate}
                disabled={disabled}
                className={inputBase}
                onChange={(e) => set("endDate", e.target.value)}
                onBlur={() => markTouched("endDate")}
              />
              {showError("endDate") && (
                <p className="mt-1 text-base text-[var(--color-danger)]">
                  {showError("endDate")}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Notes */}
        <div>
          <label htmlFor="notes" className={labelBase}>
            Notes (optional)
          </label>
          <textarea
            id="notes"
            rows={3}
            maxLength={NOTES_MAX}
            value={form.notes}
            disabled={disabled}
            placeholder="e.g. Take with a full glass of water"
            className={`${inputBase} py-3 leading-relaxed`}
            onChange={(e) => set("notes", e.target.value)}
          />
          <p className="mt-1 text-right text-base text-[var(--color-uncertain-text)]">
            {form.notes.length}/{NOTES_MAX}
          </p>
        </div>

        {saveError && (
          <p className="text-base text-[var(--color-danger)]">{saveError}</p>
        )}
      </form>

      {/* Sticky footer — sits above the global disclaimer banner */}
      <div className="fixed inset-x-0 bottom-16 z-40 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-2xl gap-3">
          <button
            type="button"
            disabled={disabled}
            onClick={() => navigate("/dashboard")}
            className="min-h-12 flex-1 rounded-xl border border-slate-300 bg-white px-4 text-lg font-semibold text-[var(--color-text)] disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!isValid || disabled}
            onClick={handleSave}
            className="min-h-12 flex-1 rounded-xl bg-[var(--color-primary)] px-4 text-lg font-semibold text-white disabled:opacity-50"
          >
            {saving ? (
              <span className="inline-flex items-center justify-center gap-2">
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                Saving…
              </span>
            ) : (
              "Save"
            )}
          </button>
        </div>
      </div>

      {/* Spacer so the sticky footer never covers the last field */}
      <div className="h-24" />
    </main>
  );
}
