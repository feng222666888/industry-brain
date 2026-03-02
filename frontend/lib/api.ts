const BASE = "";

export interface APIResponse<T = unknown> {
  code: number;
  data: T;
  message: string;
}

export async function fetchAPI<T = unknown>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`);
  const json: APIResponse<T> = await res.json();
  if (json.code !== 0) throw new Error(json.message || "API error");
  return json.data;
}

export function sseStream(
  path: string,
  body: Record<string, unknown>,
  onEvent: (event: string, data: unknown) => void,
  onDone: () => void,
): AbortController {
  const ctrl = new AbortController();
  fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: ctrl.signal,
  })
    .then(async (res) => {
      if (!res.body) return onDone();
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() || "";
        let eventType = "message";
        for (const line of lines) {
          if (line.startsWith("event: ")) {
            eventType = line.slice(7).trim();
          } else if (line.startsWith("data: ")) {
            try {
              onEvent(eventType, JSON.parse(line.slice(6)));
            } catch {
              onEvent(eventType, line.slice(6));
            }
          }
        }
      }
      onDone();
    })
    .catch(() => onDone());
  return ctrl;
}
