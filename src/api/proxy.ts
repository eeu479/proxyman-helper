const BASE_URL =
  import.meta.env.VITE_MAPY_BASE_URL ?? "http://127.0.0.1:3000";

export type ProxyStatus = {
  enabled: boolean;
  port: number;
  localIp: string;
  apiPort: number;
};

export async function getProxyStatus(): Promise<ProxyStatus> {
  const res = await fetch(`${BASE_URL}/api/proxy/status`);
  if (!res.ok) throw new Error("Failed to fetch proxy status");
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
