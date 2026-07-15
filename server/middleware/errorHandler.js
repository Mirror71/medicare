/**
 * Catch-all Express error handler.
 * Must be registered LAST with app.use(errorHandler).
 * Never leaks stack traces to the client.
 */
export default function errorHandler(err, req, res, _next) {
  console.error(`[errorHandler] ${req.method} ${req.path}:`, err);
  res.status(500).json({ ok: false, reason: 'Internal server error' });
}