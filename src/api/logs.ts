export type RequestLogEntry = {
  timestampMs: number;
  method: string;
  path: string;
  query: Record<string, string>;
  matched: boolean;
  profile?: string | null;
  subProfile?: string | null;
  request?: string | null;
  block?: string | null;
};

const DEFAULT_API_BASE = "http://127.0.0.1:3000";
const API_BASE = import.meta.env.VITE_LOCAL_PROXY_BASE_URL ?? DEFAULT_API_BASE;

type ApiError = {
  error?: string;
};

const ensureOk = async (response: Response) => {
  if (response.ok) {
    return;
  }

  let message = `Request failed (${response.status})`;
  try {
    const payload = (await response.json()) as ApiError;
    if (payload.error) {
      message = payload.error;
    }
  } catch {
    // Ignore JSON parse failures.
  }

  throw new Error(message);
};

export const fetchRequestLogs = async () => {
  const response = await fetch(`${API_BASE}/api/logs`);
  await ensureOk(response);
  return (await response.json()) as RequestLogEntry[];
};
