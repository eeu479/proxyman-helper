const BASE_URL =
  import.meta.env.VITE_MAPY_BASE_URL ?? "http://127.0.0.1:3000";

type ApiErrorPayload = {
  error?: string;
  message?: string;
};

export type ProxyStatus = {
  enabled: boolean;
  port: number;
  localIp: string;
  apiPort: number;
};

async function ensureOk(response: Response, fallbackMessage: string): Promise<void> {
  if (response.ok) {
    return;
  }

  let message = fallbackMessage;
  try {
    const payload = (await response.json()) as ApiErrorPayload;
    if (payload.error) {
      message = payload.error;
    } else if (payload.message) {
      message = payload.message;
    }
  } catch {
    // Ignore parse failures and keep fallback message.
  }

  throw new Error(message);
}

export async function getProxyStatus(): Promise<ProxyStatus> {
  const res = await fetch(`${BASE_URL}/api/proxy/status`);
  await ensureOk(res, "Failed to fetch proxy status");
  return res.json();
}

export async function installCertSimulator(): Promise<{ ok: boolean; message?: string; error?: string }> {
  const res = await fetch(`${BASE_URL}/api/proxy/install/simulator`, {
    method: "POST",
  });
  return res.json();
}

export async function installCertMacOS(): Promise<{ ok: boolean; message?: string; error?: string }> {
  const res = await fetch(`${BASE_URL}/api/proxy/install/macos`, {
    method: "POST",
  });
  return res.json();
}

export function getCertDownloadUrl(): string {
  return `${BASE_URL}/api/proxy/ca.pem`;
}

export function getMobileconfigUrl(): string {
  return `${BASE_URL}/api/proxy/ca.mobileconfig`;
}

export type RecordingStatus = {
  recording: boolean;
};

export async function startRecording(): Promise<RecordingStatus> {
  const res = await fetch(`${BASE_URL}/api/proxy/recording/start`, {
    method: "POST",
  });
  await ensureOk(res, "Failed to start recording");
  return res.json();
}

export async function stopRecording(): Promise<RecordingStatus> {
  const res = await fetch(`${BASE_URL}/api/proxy/recording/stop`, {
    method: "POST",
  });
  await ensureOk(res, "Failed to stop recording");
  return res.json();
}

export async function getRecordingStatus(): Promise<RecordingStatus> {
  const res = await fetch(`${BASE_URL}/api/proxy/recording/status`);
  await ensureOk(res, "Failed to fetch recording status");
  return res.json();
}
