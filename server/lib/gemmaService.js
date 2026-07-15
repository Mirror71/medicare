import { GoogleGenerativeAI } from '@google/generative-ai';
import { getPrompt } from './prompts.js';
import { validate } from './validators.js';

// ─── Client init (lazy singleton) ─────────────────────────────────────────────
let _client = null;
function getClient() {
  if (!_client) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY is not set in environment');
    _client = new GoogleGenerativeAI(apiKey);
  }
  return _client;
}

function getModel() {
  const modelId = process.env.GEMINI_MODEL_ID;
  if (!modelId) throw new Error('GEMINI_MODEL_ID is not set in environment');
  return getClient().getGenerativeModel({ model: modelId });
}

// ─── Extract a JSON object from model text ────────────────────────────────────
// Gemma often adds prose/reasoning around the JSON; pull out the first balanced
// { … } object, ignoring braces that appear inside string literals.
function extractJson(text) {
  const t = text
    .replace(/^\s*```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim();
  const start = t.indexOf('{');
  if (start === -1) return t;
  let depth = 0, inStr = false, esc = false;
  for (let i = start; i < t.length; i++) {
    const c = t[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === '"') inStr = false;
    } else if (c === '"') inStr = true;
    else if (c === '{') depth++;
    else if (c === '}') { if (--depth === 0) return t.slice(start, i + 1); }
  }
  return t.slice(start);
}

// ─── Build content parts per type ─────────────────────────────────────────────
function buildParts(type, prompt, payload) {
  if (type === 'photo-id') {
    const { imageBase64, mimeType } = payload;
    return [
      { text: prompt },
      { inlineData: { mimeType, data: imageBase64 } },
    ];
  }

  // Text-only types: interpolate payload into user message
  let userMessage;
  if (type === 'interaction') {
    userMessage = `Drug A: ${payload.drugA}\nDrug B: ${payload.drugB}`;
  } else if (type === 'side-effects') {
    userMessage = `Medication: ${payload.medication}`;
  } else if (type === 'symptom') {
    const medList = Array.isArray(payload.medications)
      ? payload.medications.join(', ')
      : payload.medications || 'none provided';
    userMessage = `Symptom: ${payload.message}\nCurrent medications: ${medList}`;
  } else {
    userMessage = JSON.stringify(payload);
  }

  return [{ text: `${prompt}\n\n${userMessage}` }];
}

// ─── Single attempt ───────────────────────────────────────────────────────────
async function attempt(type, payload, isRetry) {
  const model = getModel();
  const prompt = getPrompt(type, isRetry);
  const parts = buildParts(type, prompt, payload);

  // Prime the reply with "{" (assistant prefill). Gemma otherwise tends to emit a
  // reasoning scratchpad instead of a JSON object; this forces a JSON continuation.
  const result = await model.generateContent({
    contents: [
      { role: 'user', parts },
      { role: 'model', parts: [{ text: '{' }] },
    ],
    // temperature MUST be non-zero: greedy decoding (0) sends Gemma 4 into
    // token-repetition loops on longer outputs.
    generationConfig: { temperature: 0.3, topP: 0.95, maxOutputTokens: 1536 },
  });
  const raw = result.response.text();
  const full = raw.trimStart().startsWith('{') ? raw : `{${raw}`;
  const cleaned = extractJson(full);

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    return { ok: false, reason: `JSON parse failed: ${cleaned.slice(0, 200)}` };
  }

  const validation = validate(type, parsed);
  if (!validation.valid) {
    return { ok: false, reason: `Validation failed: ${validation.reason}` };
  }

  return { ok: true, data: validation.data };
}

// ─── Main export ──────────────────────────────────────────────────────────────
/**
 * callGemma(type, payload) → { ok: true, data } | { ok: false, reason }
 *
 * Handles: multimodal (photo-id), text (interaction, side-effects, symptom)
 * Retries once with a stricter prompt if parse/validation fails.
 * Never throws — all errors become { ok: false, reason }.
 */
export async function callGemma(type, payload) {
  try {
    // First attempt
    const first = await attempt(type, payload, false);
    if (first.ok) return first;

    // Retry once with the retry prompt
    console.warn(`[gemmaService] First attempt failed for "${type}": ${first.reason}. Retrying...`);
    const retry = await attempt(type, payload, true);
    if (retry.ok) return retry;

    console.error(`[gemmaService] Retry also failed for "${type}": ${retry.reason}`);
    return { ok: false, reason: retry.reason };

  } catch (err) {
    console.error(`[gemmaService] Gemini API error for "${type}":`, err.message);
    return { ok: false, reason: err.message };
  }
}