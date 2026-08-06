// Yono Workout — DeepSeek AI Client
// Server-side only. Never imported by client components.
// API key stays in server environment only.

const DEEPSEEK_API_URL =
  process.env.DEEPSEEK_API_URL || "https://api.deepseek.com";
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || "deepseek-chat";
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || "sk-7b78d263cce44dbe981ee0555788c1f9";

export interface DeepSeekMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface DeepSeekRequestOptions {
  messages: DeepSeekMessage[];
  temperature?: number;
  maxTokens?: number;
  responseFormat?: { type: "json_object" | "text" };
  timeoutMs?: number;
}

export class DeepSeekError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly code?: string
  ) {
    super(message);
    this.name = "DeepSeekError";
  }
}

export async function callDeepSeek(
  options: DeepSeekRequestOptions
): Promise<string> {
  if (!DEEPSEEK_API_KEY) {
    throw new DeepSeekError(
      "DEEPSEEK_API_KEY is not configured",
      undefined,
      "MISSING_API_KEY"
    );
  }

  const {
    messages,
    temperature = 0.7,
    maxTokens = 2048,
    responseFormat,
    timeoutMs = 30000,
  } = options;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const body: Record<string, unknown> = {
      model: DEEPSEEK_MODEL,
      messages,
      temperature,
      max_tokens: maxTokens,
    };

    if (responseFormat) {
      body.response_format = responseFormat;
    }

    const response = await fetch(`${DEEPSEEK_API_URL}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      throw new DeepSeekError(
        `DeepSeek API error: ${response.status} ${errorText}`,
        response.status
      );
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;

    if (!content) {
      throw new DeepSeekError("Empty response from DeepSeek", undefined, "EMPTY_RESPONSE");
    }

    return content as string;
  } catch (error) {
    if (error instanceof DeepSeekError) throw error;
    if ((error as Error).name === "AbortError") {
      throw new DeepSeekError("Request timed out", undefined, "TIMEOUT");
    }
    throw new DeepSeekError(
      `Network error: ${(error as Error).message}`,
      undefined,
      "NETWORK_ERROR"
    );
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Call DeepSeek and parse JSON response.
 * Retries once on JSON parse failure with a stricter prompt.
 */
export async function callDeepSeekJSON<T>(
  options: DeepSeekRequestOptions,
  validator: (raw: unknown) => T
): Promise<T> {
  const content = await callDeepSeek({
    ...options,
    responseFormat: { type: "json_object" },
  });

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    // Retry once — ask for pure JSON only
    const retryMessages: DeepSeekMessage[] = [
      ...options.messages,
      { role: "assistant", content },
      {
        role: "user",
        content:
          "Your response was not valid JSON. Please respond ONLY with the JSON object, no markdown, no explanation.",
      },
    ];

    const retryContent = await callDeepSeek({
      ...options,
      messages: retryMessages,
      responseFormat: { type: "json_object" },
    });

    try {
      parsed = JSON.parse(retryContent);
    } catch {
      throw new DeepSeekError(
        "DeepSeek returned invalid JSON after retry",
        undefined,
        "INVALID_JSON"
      );
    }
  }

  return validator(parsed);
}
