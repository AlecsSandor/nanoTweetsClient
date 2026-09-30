import { geminiApiUrl, GEMINI_API_TOKEN } from './config';

/** Non-2xx response from the Gemini microservice. `status` lets callers react to e.g. 429. */
export class GeminiApiError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'GeminiApiError';
    this.status = status;
  }
}

// A little longer than the service's own GEMINI_REQUEST_TIMEOUT_MS (30s), so
// the service's 504 normally arrives first and this is only a backstop.
const REQUEST_TIMEOUT_MS = 35_000;

/** POST /api/generate — single-turn text generation. Resolves with the model's text. */
export async function generateText(prompt: string, signal?: AbortSignal): Promise<string> {
  const controller = new AbortController();
  const forwardAbort = () => controller.abort();
  if (signal?.aborted) controller.abort();
  signal?.addEventListener('abort', forwardAbort);
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(geminiApiUrl('/api/generate'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(GEMINI_API_TOKEN ? { Authorization: `Bearer ${GEMINI_API_TOKEN}` } : {}),
      },
      body: JSON.stringify({ prompt }),
      signal: controller.signal,
    });

    if (!res.ok) throw new GeminiApiError(`Gemini request failed (${res.status})`, res.status);

    const data: unknown = await res.json();
    const text = (data as { text?: unknown } | null)?.text;
    if (typeof text !== 'string' || !text.trim()) {
      throw new GeminiApiError('Gemini returned an empty response', res.status);
    }
    return text.trim();
  } finally {
    window.clearTimeout(timeout);
    signal?.removeEventListener('abort', forwardAbort);
  }
}
