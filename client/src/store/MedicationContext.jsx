import { createContext, useContext, useReducer, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';

// ─── Constants ────────────────────────────────────────────────────────────────
export const PATIENT_ID = 'demo_patient';

const TIME_BUCKETS = {
  Morning:   { start: 5,  end: 11 },  // 05:00–11:59
  Afternoon: { start: 12, end: 16 },  // 12:00–16:59
  Evening:   { start: 17, end: 20 },  // 17:00–20:59
  Night:     { start: 21, end: 4  },  // 21:00–04:59 (wraps midnight)
};

// ─── Reducer ──────────────────────────────────────────────────────────────────
const initialState = {
  medications: [],
  interactions: [],
  doseLogs: [],
  loading: true,
  error: null,
};

function reducer(state, action) {
  switch (action.type) {
    // ── Initial load ──
    case 'INIT_LOAD':
      return {
        ...state,
        medications: action.medications,
        interactions: action.interactions,
        loading: false,
      };
    case 'INIT_ERROR':
      return { ...state, loading: false, error: action.error };

    // ── Medications ──
    case 'MED_INSERT':
      if (state.medications.find(m => m.id === action.row.id)) return state;
      return { ...state, medications: [...state.medications, action.row] };
    case 'MED_UPDATE':
      return {
        ...state,
        medications: state.medications.map(m =>
          m.id === action.row.id ? { ...m, ...action.row } : m
        ),
      };
    case 'MED_DELETE':
      return {
        ...state,
        medications: state.medications.filter(m => m.id !== action.id),
        // cascade: remove dose_log entries for this medication
        doseLogs: state.doseLogs.filter(d => d.medication_id !== action.id),
      };

    // ── Interactions ──
    case 'INT_INSERT':
      if (state.interactions.find(i => i.id === action.row.id)) return state;
      return { ...state, interactions: [...state.interactions, action.row] };
    case 'INT_UPDATE':
      return {
        ...state,
        interactions: state.interactions.map(i =>
          i.id === action.row.id ? { ...i, ...action.row } : i
        ),
      };
    case 'INT_DELETE':
      return {
        ...state,
        interactions: state.interactions.filter(i => i.id !== action.id),
      };

    // ── Dose log ──
    case 'DOSE_INSERT':
      if (state.doseLogs.find(d => d.id === action.row.id)) return state;
      return { ...state, doseLogs: [...state.doseLogs, action.row] };
    case 'DOSE_UPDATE':
      return {
        ...state,
        doseLogs: state.doseLogs.map(d =>
          d.id === action.row.id ? { ...d, ...action.row } : d
        ),
      };
    case 'DOSE_DELETE':
      return {
        ...state,
        doseLogs: state.doseLogs.filter(d => d.id !== action.id),
      };

    default:
      return state;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getBucket(timeStr) {
  // timeStr is like "08:00", "14:30", etc.
  const hour = parseInt(timeStr.split(':')[0], 10);
  if (hour >= 5  && hour <= 11) return 'Morning';
  if (hour >= 12 && hour <= 16) return 'Afternoon';
  if (hour >= 17 && hour <= 20) return 'Evening';
  return 'Night'; // 21–04
}

function todayDateStr() {
  return new Date().toISOString().split('T')[0]; // "YYYY-MM-DD"
}

function buildScheduledAt(dateStr, timeStr) {
  // Combine a date string "YYYY-MM-DD" with "HH:MM" → ISO timestamp (local)
  return new Date(`${dateStr}T${timeStr}:00`);
}

// Compare two timestamps by the instant they represent, not by string form.
// Postgres returns timestamptz as "…+00:00" (µs precision) while the client
// builds "…Z" via Date.toISOString(); a raw === would never match.
function sameInstant(a, b) {
  return new Date(a).getTime() === new Date(b).getTime();
}

// ─── Context ──────────────────────────────────────────────────────────────────
const MedicationContext = createContext(null);

export function MedicationProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // ── Initial fetch ──────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const today = todayDateStr();

        const [medsRes, intsRes, doseRes] = await Promise.all([
          supabase
            .from('medications')
            .select('*')
            .eq('patient_id', PATIENT_ID),
          supabase
            .from('interactions')
            .select('*')
            .eq('patient_id', PATIENT_ID),
          supabase
            .from('dose_log')
            .select('*')
            .eq('patient_id', PATIENT_ID)
            .gte('scheduled_at', `${today}T00:00:00`)
            .lte('scheduled_at', `${today}T23:59:59`),
        ]);

        if (medsRes.error) throw medsRes.error;
        if (intsRes.error) throw intsRes.error;
        // dose_log may be empty — not fatal
        if (!cancelled) {
          dispatch({
            type: 'INIT_LOAD',
            medications: medsRes.data ?? [],
            interactions: intsRes.data ?? [],
          });
          // Seed dose logs into state via individual inserts so realtime path is uniform
          (doseRes.data ?? []).forEach(row =>
            dispatch({ type: 'DOSE_INSERT', row })
          );
        }
      } catch (err) {
        if (!cancelled) dispatch({ type: 'INIT_ERROR', error: err.message });
      }
    }

    init();
    return () => { cancelled = true; };
  }, []);

  // ── Realtime subscriptions ─────────────────────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel(`patient-${PATIENT_ID}`)

      // medications
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'medications',
          filter: `patient_id=eq.${PATIENT_ID}`,
        },
        ({ eventType, new: row, old }) => {
          if (eventType === 'INSERT') dispatch({ type: 'MED_INSERT', row });
          if (eventType === 'UPDATE') dispatch({ type: 'MED_UPDATE', row });
          if (eventType === 'DELETE') dispatch({ type: 'MED_DELETE', id: old.id });
        }
      )

      // interactions
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'interactions',
          filter: `patient_id=eq.${PATIENT_ID}`,
        },
        ({ eventType, new: row, old }) => {
          if (eventType === 'INSERT') dispatch({ type: 'INT_INSERT', row });
          if (eventType === 'UPDATE') dispatch({ type: 'INT_UPDATE', row });
          if (eventType === 'DELETE') dispatch({ type: 'INT_DELETE', id: old.id });
        }
      )

      // dose_log
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'dose_log',
          filter: `patient_id=eq.${PATIENT_ID}`,
        },
        ({ eventType, new: row, old }) => {
          if (eventType === 'INSERT') dispatch({ type: 'DOSE_INSERT', row });
          if (eventType === 'UPDATE') dispatch({ type: 'DOSE_UPDATE', row });
          if (eventType === 'DELETE') dispatch({ type: 'DOSE_DELETE', id: old.id });
        }
      )

      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // ── Actions ────────────────────────────────────────────────────────────────
  async function addMedication(med) {
    const id = crypto.randomUUID();
    const row = {
      ...med,
      id,
      patient_id: PATIENT_ID,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from('medications').insert(row);
    if (error) throw error;
    // Realtime will fire MED_INSERT — no optimistic dispatch needed
  }

  async function updateMedication(id, updates) {
    const { error } = await supabase
      .from('medications')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('patient_id', PATIENT_ID);
    if (error) throw error;
  }

  async function deleteMedication(id) {
    const { error } = await supabase
      .from('medications')
      .delete()
      .eq('id', id)
      .eq('patient_id', PATIENT_ID);
    if (error) throw error;
  }

  async function toggleDose(medicationId, scheduledAt) {
    // scheduledAt is an ISO string or Date
    const scheduledAtISO =
      scheduledAt instanceof Date ? scheduledAt.toISOString() : scheduledAt;

    // Check if a row already exists in local state
    const existing = state.doseLogs.find(
      d =>
        d.medication_id === medicationId &&
        sameInstant(d.scheduled_at, scheduledAtISO)
    );

    if (!existing) {
      // Insert new taken=true row
      const { error } = await supabase.from('dose_log').insert({
        medication_id: medicationId,
        patient_id: PATIENT_ID,
        scheduled_at: scheduledAtISO,
        taken: true,
        taken_at: new Date().toISOString(),
      });
      if (error) throw error;
    } else {
      // Toggle taken
      const newTaken = !existing.taken;
      const { error } = await supabase
        .from('dose_log')
        .update({
          taken: newTaken,
          taken_at: newTaken ? new Date().toISOString() : null,
        })
        .eq('id', existing.id);
      if (error) throw error;
    }
  }

  async function acknowledgeInteraction(interactionId) {
    const { error } = await supabase
      .from('interactions')
      .update({ acknowledged_at: new Date().toISOString() })
      .eq('id', interactionId)
      .eq('patient_id', PATIENT_ID);
    if (error) throw error;
  }

  // ── Computed values ────────────────────────────────────────────────────────
  const computed = useMemo(() => {
    const today = todayDateStr();
    const now = new Date();
    const currentHour = now.getHours();

    // Active medications: ongoing OR within start/end date range
    const activeMeds = state.medications.filter(m => {
      if (m.end_date && m.end_date < today) return false;
      if (m.start_date > today) return false;
      return true;
    });

    // Build a flat list of today's scheduled slots from active meds
    const todaySlots = [];
    for (const med of activeMeds) {
      for (const timeStr of med.times_of_day ?? []) {
        const scheduledAt = buildScheduledAt(today, timeStr);
        const scheduledAtISO = scheduledAt.toISOString();
        const log = state.doseLogs.find(
          d =>
            d.medication_id === med.id &&
            sameInstant(d.scheduled_at, scheduledAtISO)
        );
        todaySlots.push({
          med,
          timeStr,
          scheduledAt,
          scheduledAtISO,
          bucket: getBucket(timeStr),
          taken: log?.taken ?? false,
          taken_at: log?.taken_at ?? null,
          logId: log?.id ?? null,
        });
      }
    }

    // todaysSchedule — grouped by bucket
    const todaysSchedule = {};
    for (const bucket of Object.keys(TIME_BUCKETS)) {
      todaysSchedule[bucket] = todaySlots.filter(s => s.bucket === bucket);
    }

    // adherencePercent — doses taken / doses scheduled UP TO current hour
    const dueSlots = todaySlots.filter(s => s.scheduledAt.getHours() <= currentHour);
    const takenCount = dueSlots.filter(s => s.taken).length;
    const adherencePercent =
      dueSlots.length === 0 ? 100 : Math.round((takenCount / dueSlots.length) * 100);

    // missedDoses — past the scheduled time by >60min, not taken
    const sixtyMinAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const missedDoses = todaySlots.filter(
      s => !s.taken && s.scheduledAt < sixtyMinAgo
    );

    // activeWarnings — unacknowledged caution/danger/uncertain interactions
    const WARN_STATUSES = new Set(['caution', 'danger', 'uncertain']);
    const activeWarnings = state.interactions.filter(
      i => WARN_STATUSES.has(i.status) && !i.acknowledged_at
    );

    // highestSeverity
    const SEVERITY_ORDER = ['danger', 'caution', 'uncertain', 'safe'];
    let highestSeverity = 'safe';
    for (const level of SEVERITY_ORDER) {
      if (activeWarnings.some(i => i.status === level)) {
        highestSeverity = level;
        break;
      }
    }

    return {
      todaysSchedule,
      adherencePercent,
      missedDoses,
      activeWarnings,
      highestSeverity,
    };
  }, [state.medications, state.interactions, state.doseLogs]);

  // ── Context value ──────────────────────────────────────────────────────────
  const value = {
    // Raw state
    medications: state.medications,
    interactions: state.interactions,
    doseLogs: state.doseLogs,
    loading: state.loading,
    error: state.error,

    // Actions
    addMedication,
    updateMedication,
    deleteMedication,
    toggleDose,
    acknowledgeInteraction,

    // Computed
    ...computed,
  };

  return (
    <MedicationContext.Provider value={value}>
      {children}
    </MedicationContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useMedication() {
  const ctx = useContext(MedicationContext);
  if (!ctx) throw new Error('useMedication must be used inside <MedicationProvider>');
  return ctx;
}