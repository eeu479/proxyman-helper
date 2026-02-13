import type { Block } from "../types/block";

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

export type BlocksPayload = {
  libraryBlocks: Block[];
  activeBlocks: Block[];
};

export const fetchBlocks = async (profileName: string) => {
  const response = await fetch(
    `${API_BASE}/api/profiles/${encodeURIComponent(profileName)}/blocks`
  );
  await ensureOk(response);
  return (await response.json()) as BlocksPayload;
};

export const updateBlocks = async (profileName: string, payload: BlocksPayload) => {
  const response = await fetch(
    `${API_BASE}/api/profiles/${encodeURIComponent(profileName)}/blocks`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );
  await ensureOk(response);
  return (await response.json()) as BlocksPayload;
};
