const BASE_URL = process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434';
const CHAT_MODEL = process.env.TORPOR_CHAT_MODEL ?? 'qwen3:8b';
const EMBED_MODEL = process.env.TORPOR_EMBED_MODEL ?? 'nomic-embed-text';

/**
 * Asks the local Ollama model to write a short summary. No network call leaves
 * the machine: this hits localhost only.
 */
export async function chat(prompt) {
  const res = await fetch(`${BASE_URL}/api/chat`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      model: CHAT_MODEL,
      stream: false,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!res.ok) {
    throw new Error(`Ollama chat failed (${res.status}): ${await res.text()}`);
  }
  const data = await res.json();
  return data.message?.content ?? '';
}

/**
 * Embeds one or more strings locally via Ollama. Returns an array of vectors
 * in the same order as the input.
 */
export async function embed(inputs) {
  const res = await fetch(`${BASE_URL}/api/embed`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ model: EMBED_MODEL, input: inputs }),
  });
  if (!res.ok) {
    throw new Error(`Ollama embed failed (${res.status}): ${await res.text()}`);
  }
  const data = await res.json();
  return data.embeddings;
}

export function cosineSimilarity(a, b) {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export async function checkAvailable() {
  try {
    const res = await fetch(`${BASE_URL}/api/tags`);
    if (!res.ok) return { ok: false, reason: `Ollama responded ${res.status}` };
    const data = await res.json();
    const names = (data.models ?? []).map((m) => m.name);
    const missing = [CHAT_MODEL, EMBED_MODEL].filter(
      (want) => !names.some((n) => n === want || n.startsWith(want.split(':')[0])),
    );
    if (missing.length) {
      return { ok: false, reason: `missing model(s): ${missing.join(', ')} (try: ollama pull ${missing.join(' && ollama pull ')})` };
    }
    return { ok: true, chatModel: CHAT_MODEL, embedModel: EMBED_MODEL };
  } catch (err) {
    return { ok: false, reason: `can't reach Ollama at ${BASE_URL} (${err.message}). Is it running?` };
  }
}
