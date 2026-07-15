// In dev, Vite proxies /api/* → Express on localhost:3001 (see vite.config.js).
// VITE_API_URL is only needed when the API is deployed to a separate origin;
// leave it unset (or empty) to keep using the proxy / same-origin default.
const API_URL = import.meta.env.VITE_API_URL ?? "";

export async function callGemma(type, payload) {
  const res = await fetch(`${API_URL}/api/gemma/${type}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}
