// ─── Helpers ──────────────────────────────────────────────────────────────────
function isString(v)  { return typeof v === 'string' && v.length > 0; }
function isBool(v)    { return typeof v === 'boolean'; }
function isArray(v)   { return Array.isArray(v); }
function oneOf(v, ...opts) { return opts.includes(v); }

// ─── Per-type validators ──────────────────────────────────────────────────────
const VALIDATORS = {
  'photo-id'(p) {
    if (!isBool(p.readable))
      return 'readable must be a boolean';
    if (!oneOf(p.confidence, 'high', 'medium', 'low'))
      return 'confidence must be high|medium|low';
    if (p.readable === true && !isString(p.name))
      return 'name must be a non-empty string when readable is true';
    return null;
  },

  interaction(p) {
    if (!oneOf(p.status, 'safe', 'caution', 'danger', 'uncertain'))
      return 'status must be safe|caution|danger|uncertain';
    if (!oneOf(p.severity, 'none', 'low', 'moderate', 'high', 'unknown'))
      return 'severity must be none|low|moderate|high|unknown';
    if (!p.pair || !isString(p.pair.drugA))
      return 'pair.drugA must be a non-empty string';
    if (!p.pair || !isString(p.pair.drugB))
      return 'pair.drugB must be a non-empty string';
    if (!isString(p.headline))
      return 'headline must be a non-empty string';
    if (!isString(p.recommendation))
      return 'recommendation must be a non-empty string';
    if (!isBool(p.isUncertain))
      return 'isUncertain must be a boolean';
    if (!isString(p.disclaimer))
      return 'disclaimer must be a non-empty string';
    return null;
  },

  'side-effects'(p) {
    if (!isString(p.medication))
      return 'medication must be a non-empty string';
    if (!isString(p.summary))
      return 'summary must be a non-empty string';
    if (!isArray(p.common))
      return 'common must be an array';
    if (!isArray(p.serious))
      return 'serious must be an array';
    if (!isBool(p.isUncertain))
      return 'isUncertain must be a boolean';
    if (!isString(p.disclaimer))
      return 'disclaimer must be a non-empty string';
    return null;
  },

  symptom(p) {
    if (!isString(p.reply))
      return 'reply must be a non-empty string';
    if (!oneOf(p.urgency, 'emergency', 'soon', 'routine', 'uncertain'))
      return 'urgency must be emergency|soon|routine|uncertain';
    if (!isString(p.recommendation))
      return 'recommendation must be a non-empty string';
    if (!isBool(p.isUncertain))
      return 'isUncertain must be a boolean';
    if (!isString(p.disclaimer))
      return 'disclaimer must be a non-empty string';
    return null;
  },
};

// ─── Main export ──────────────────────────────────────────────────────────────
/**
 * validate(type, parsed) → { valid: true, data } | { valid: false, reason }
 */
export function validate(type, parsed) {
  const validator = VALIDATORS[type];
  if (!validator) return { valid: false, reason: `Unknown type: ${type}` };
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
    return { valid: false, reason: 'Parsed value is not a plain object' };

  const reason = validator(parsed);
  if (reason) return { valid: false, reason };
  return { valid: true, data: parsed };
}