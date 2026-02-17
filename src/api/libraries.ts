const DEFAULT_API_BASE = "http://127.0.0.1:3000";
const API_BASE = import.meta.env.VITE_LOCAL_PROXY_BASE_URL ?? DEFAULT_API_BASE;

export type Library = {
  id: string;
  name: string;
  type: "local" | "remote";
  gitUrl?: string | null;
  gitRef?: string | null;
  auth?: string | null;
  clonePath?: string | null;
};

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
    // Ignore
  }
  throw new Error(message);
};

export const fetchLibraries = async (profileName: string): Promise<Library[]> => {
  const response = await fetch(
    `${API_BASE}/api/profiles/${encodeURIComponent(profileName)}/libraries`
  );
  await ensureOk(response);
  const data = (await response.json()) as Library[];
  return data.map((lib) => ({
    ...lib,
    type: (lib.type ?? "local") as "local" | "remote",
  }));
};

export type AddLibraryInput = {
  name: string;
  type: "remote";
  gitUrl: string;
  gitRef?: string;
  auth?: string;
};

export const addLibrary = async (
  profileName: string,
  input: AddLibraryInput
): Promise<Library> => {
  const response = await fetch(
    `${API_BASE}/api/profiles/${encodeURIComponent(profileName)}/libraries`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }
  );
  await ensureOk(response);
  return (await response.json()) as Library;
};

export type UpdateLibraryInput = {
  name?: string;
  gitRef?: string;
};

export const updateLibrary = async (
  profileName: string,
  libId: string,
  input: UpdateLibraryInput
): Promise<Library> => {
  const response = await fetch(
    `${API_BASE}/api/profiles/${encodeURIComponent(profileName)}/libraries/${encodeURIComponent(libId)}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }
  );
  await ensureOk(response);
  return (await response.json()) as Library;
};

export const deleteLibrary = async (
  profileName: string,
  libId: string
): Promise<void> => {
  const response = await fetch(
    `${API_BASE}/api/profiles/${encodeURIComponent(profileName)}/libraries/${encodeURIComponent(libId)}`,
    { method: "DELETE" }
  );
  await ensureOk(response);
};

export type LibraryStatus = {
  hasUncommittedChanges: boolean;
  aheadCount: number;
  behindCount: number;
};

export const fetchLibraryStatus = async (
  profileName: string,
  libId: string
): Promise<LibraryStatus> => {
  const response = await fetch(
    `${API_BASE}/api/profiles/${encodeURIComponent(profileName)}/libraries/${encodeURIComponent(libId)}/status`
  );
  await ensureOk(response);
  return response.json() as Promise<LibraryStatus>;
};

export const pullLibrary = async (
  profileName: string,
  libId: string
): Promise<void> => {
  const response = await fetch(
    `${API_BASE}/api/profiles/${encodeURIComponent(profileName)}/libraries/${encodeURIComponent(libId)}/pull`,
    { method: "POST" }
  );
  await ensureOk(response);
};

export type PushLibraryOptions = {
  commitMessage?: string;
};

export const pushLibrary = async (
  profileName: string,
  libId: string,
  options?: PushLibraryOptions
): Promise<void> => {
  const body =
    options?.commitMessage != null && options.commitMessage.trim() !== ""
      ? JSON.stringify({ commitMessage: options.commitMessage.trim() })
      : undefined;
  const response = await fetch(
    `${API_BASE}/api/profiles/${encodeURIComponent(profileName)}/libraries/${encodeURIComponent(libId)}/push`,
    {
      method: "POST",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body,
    }
  );
  await ensureOk(response);
};
