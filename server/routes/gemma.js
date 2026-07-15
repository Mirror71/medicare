import { Router } from 'express';
import { callGemma } from '../lib/gemmaService.js';

const router = Router();

// ─── Helpers ──────────────────────────────────────────────────────────────────
function missingFields(body, ...fields) {
  return fields.filter(f => !body[f] && body[f] !== false);
}

// ─── POST /api/gemma/photo-id ─────────────────────────────────────────────────
router.post('/photo-id', async (req, res, next) => {
  try {
    const missing = missingFields(req.body, 'imageBase64', 'mimeType');
    if (missing.length) {
      return res.status(400).json({ ok: false, reason: `Missing fields: ${missing.join(', ')}` });
    }

    const { imageBase64, mimeType } = req.body;
    const result = await callGemma('photo-id', { imageBase64, mimeType });

    if (result.ok) return res.json(result.data);
    return res.status(502).json({ ok: false, reason: result.reason });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/gemma/interaction ──────────────────────────────────────────────
router.post('/interaction', async (req, res, next) => {
  try {
    const missing = missingFields(req.body, 'drugA', 'drugB');
    if (missing.length) {
      return res.status(400).json({ ok: false, reason: `Missing fields: ${missing.join(', ')}` });
    }

    const { drugA, drugB } = req.body;
    const result = await callGemma('interaction', { drugA, drugB });

    if (result.ok) return res.json(result.data);

    // Critical fail-safe: never let a failed interaction read as "safe"
    // Return 200 with a typed uncertain fallback so the client renders the Uncertain card
    console.error(`[route/interaction] Returning uncertain fallback. Reason: ${result.reason}`);
    return res.json({
      status: 'uncertain',
      severity: 'unknown',
      pair: { drugA, drugB },
      headline: "We couldn't confirm whether these are safe together",
      explanation: 'The check could not be completed.',
      mechanism: null,
      recommendation: 'Please ask a pharmacist before taking these together.',
      confidence: 'low',
      isUncertain: true,
      uncertaintyReason: result.reason,
      disclaimer: 'This is general information, not medical advice. Always confirm with a healthcare professional.',
    });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/gemma/side-effects ─────────────────────────────────────────────
router.post('/side-effects', async (req, res, next) => {
  try {
    const missing = missingFields(req.body, 'medication');
    if (missing.length) {
      return res.status(400).json({ ok: false, reason: `Missing fields: ${missing.join(', ')}` });
    }

    const { medication } = req.body;
    const result = await callGemma('side-effects', { medication });

    if (result.ok) return res.json(result.data);
    return res.status(502).json({ ok: false, reason: result.reason });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/gemma/symptom ──────────────────────────────────────────────────
router.post('/symptom', async (req, res, next) => {
  try {
    const missing = missingFields(req.body, 'message', 'medications');
    if (missing.length) {
      return res.status(400).json({ ok: false, reason: `Missing fields: ${missing.join(', ')}` });
    }
    if (!Array.isArray(req.body.medications)) {
      return res.status(400).json({ ok: false, reason: 'medications must be an array' });
    }

    const { message, medications } = req.body;
    const result = await callGemma('symptom', { message, medications });

    if (result.ok) return res.json(result.data);
    return res.status(502).json({ ok: false, reason: result.reason });
  } catch (err) {
    next(err);
  }
});

export default router;