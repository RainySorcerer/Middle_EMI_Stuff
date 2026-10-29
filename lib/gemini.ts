/**
 * Minimal Gemini (Google AI Studio) client.
 *
 * Uses the REST API directly so there is no SDK dependency and the key never
 * leaves the server. Two callers use it:
 *   - lib/pdf.ts   turns a statement PDF into transactions
 *   - lib/ai.ts    writes the optional narrative when Gemini is the provider
 *
 * GEMINI_API_BASE exists so tests can point at a local stub.
 */

export type GeminiPart =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } };

export interface GeminiJsonOptions {
  system: string;
  parts: GeminiPart[];
  schema?: Record<string, unknown>;
  maxOutputTokens?: number;
  timeoutMs?: number;
  /** 0 disables Gemini 2.5 "thinking"; useful for strict, fast extraction. */
  thinkingBudget?: number;
}

export class GeminiError extends Error {
  readonly status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "GeminiError";
    this.status = status;
  }
}

export function geminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

export function geminiModel(): string {
  return process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";
}

function apiBase(): string {
  return (process.env.GEMINI_API_BASE?.trim() || "https://generativelanguage.googleapis.com").replace(
    /\/+$/,
    ""
  );
}

export async function geminiJson<T>(options: GeminiJsonOptions): Promise<T> {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) throw new GeminiError("GEMINI_API_KEY is not set");

  const model = geminiModel();
  const url = `${apiBase()}/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  const timeoutMs = options.timeoutMs ?? 60_000;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let response: Response;

  try {
    response = await fetch(url, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "content-type": "application/json",
        "x-goog-api-key": key,
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: options.system }] },
        contents: [{ role: "user", parts: options.parts }],
        generationConfig: {
          temperature: 0,
          responseMimeType: "application/json",
          maxOutputTokens: options.maxOutputTokens ?? 8192,
          ...(options.schema ? { responseSchema: options.schema } : {}),
          ...(typeof options.thinkingBudget === "number"
            ? { thinkingConfig: { thinkingBudget: options.thinkingBudget } }
            : {}),
        },
      }),
    });
  } catch (error) {
    const timedOut = (error as { name?: string }).name === "AbortError";
    throw new GeminiError(timedOut ? "Gemini request timed out" : "Gemini request failed");
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    const detail = (await response.text().catch(() => "")).slice(0, 240);
    throw new GeminiError(`Gemini returned ${response.status}${detail ? `: ${detail}` : ""}`, response.status);
  }

  const payload = (await response.json().catch(() => null)) as {
    candidates?: {
      finishReason?: string;
      content?: { parts?: { text?: string }[] };
    }[];
  } | null;

  const candidate = payload?.candidates?.[0];
  if (candidate?.finishReason === "MAX_TOKENS") {
    throw new GeminiError("Gemini response was truncated");
  }

  const text = candidate?.content?.parts
    ?.map((part) => part.text ?? "")
    .join("")
    .trim();

  if (!text) throw new GeminiError("Gemini returned an empty response");

  const cleaned = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    throw new GeminiError("Gemini returned malformed JSON");
  }
}
