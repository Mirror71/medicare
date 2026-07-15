const API_URL = import.meta.env.VITE_API_URL;

export async function callGemma(type, payload) {
  const res = await fetch(`${API_URL}/api/gemma/${type}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}