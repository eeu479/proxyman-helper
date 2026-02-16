import type SubProfile from "../../interfaces/subProfile";
import type { Profile } from "../types/profile";

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

export const fetchProfiles = async () => {
  const response = await fetch(`${API_BASE}/api/profiles`);
  await ensureOk(response);
  return (await response.json()) as Profile[];
};

type CreateProfilePayload = {
  name: string;
  baseUrl?: string;
  params?: string[];
};

export const createProfile = async ({
  name,
  baseUrl,
  params,
}: CreateProfilePayload) => {
  const response = await fetch(`${API_BASE}/api/profiles`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name,
      baseUrl: baseUrl || undefined,
      params: params && params.length > 0 ? params : undefined,
    }),
  });
  await ensureOk(response);
  return (await response.json()) as Profile;
};

type UpdateProfilePayload = {
  name?: string;
  baseUrl?: string;
  params?: string[];
};

export const updateProfile = async (
  currentName: string,
  { name, baseUrl, params }: UpdateProfilePayload,
) => {
  const response = await fetch(
    `${API_BASE}/api/profiles/${encodeURIComponent(currentName)}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        baseUrl,
        params,
      }),
    },
  );
  await ensureOk(response);
  return (await response.json()) as Profile;
};

export const deleteProfile = async (profileName: string) => {
  const response = await fetch(
    `${API_BASE}/api/profiles/${encodeURIComponent(profileName)}`,
    { method: "DELETE" },
  );
  await ensureOk(response);
};

type ActiveProfileResponse = {
  name?: string | null;
};

export const fetchActiveProfile = async () => {
  const response = await fetch(`${API_BASE}/api/active-profile`);
  await ensureOk(response);
  return (await response.json()) as ActiveProfileResponse;
};

export const setActiveProfile = async (name: string) => {
  const response = await fetch(`${API_BASE}/api/active-profile`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  await ensureOk(response);
  return (await response.json()) as ActiveProfileResponse;
};

type SubProfileParams = Record<string, string>;

export const createSubProfile = async (
  profileName: string,
  name: string,
  params?: SubProfileParams,
) => {
  const response = await fetch(
    `${API_BASE}/api/profiles/${encodeURIComponent(profileName)}/subprofiles`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        params: params && Object.keys(params).length > 0 ? params : undefined,
      }),
    },
  );
  await ensureOk(response);
  return (await response.json()) as SubProfile;
};

export const updateSubProfile = async (
  profileName: string,
  subprofileName: string,
  payload: { name?: string; params?: SubProfileParams },
) => {
  const response = await fetch(
    `${API_BASE}/api/profiles/${encodeURIComponent(
      profileName,
    )}/subprofiles/${encodeURIComponent(subprofileName)}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
  await ensureOk(response);
  return (await response.json()) as SubProfile;
};

export const deleteSubProfile = async (
  profileName: string,
  subprofileName: string,
) => {
  const response = await fetch(
    `${API_BASE}/api/profiles/${encodeURIComponent(
      profileName,
    )}/subprofiles/${encodeURIComponent(subprofileName)}`,
    { method: "DELETE" },
  );
  await ensureOk(response);
};
