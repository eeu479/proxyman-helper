import {
  THEME_VARIABLE_KEYS,
  THEME_EXPORT_VERSION,
  type ThemeVariables,
  type ThemeExport,
  type ThemeMode,
  isThemeVariableKey,
} from "../types/theme";

const STORAGE_KEY = "mapyThemeOverrides";

export function getOverrides(): ThemeVariables {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, string>;
    const out: ThemeVariables = {};
    for (const key of Object.keys(parsed)) {
      if (isThemeVariableKey(key) && typeof parsed[key] === "string") {
        out[key] = parsed[key];
      }
    }
    return out;
  } catch {
    return {};
  }
}

export function setOverrides(partial: ThemeVariables): ThemeVariables {
  const current = getOverrides();
  const next = { ...current };
  for (const key of Object.keys(partial)) {
    if (isThemeVariableKey(key)) {
      const value = partial[key];
      if (value != null && value !== "") {
        next[key] = value;
      } else {
        delete next[key];
      }
    }
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  applyOverrides(next);
  return next;
}

export function clearOverrides(): void {
  localStorage.removeItem(STORAGE_KEY);
  clearAppliedOverrides();
}

/** Set CSS custom properties on documentElement so they override :root and body[data-theme]. */
export function applyOverrides(overrides: ThemeVariables): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  for (const key of THEME_VARIABLE_KEYS) {
    const value = overrides[key];
    if (value != null && value !== "") {
      root.style.setProperty(key, value);
    } else {
      root.style.removeProperty(key);
    }
  }
}

/** Remove any theme overrides from the DOM (revert to CSS defaults). */
function clearAppliedOverrides(): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  for (const key of THEME_VARIABLE_KEYS) {
    root.style.removeProperty(key);
  }
}

/** Get current computed values for all theme variables (for export). */
export function getComputedThemeVariables(): ThemeVariables {
  if (typeof document === "undefined") return {};
  const root = document.documentElement;
  const style = getComputedStyle(root);
  const out: ThemeVariables = {};
  for (const key of THEME_VARIABLE_KEYS) {
    const value = style.getPropertyValue(key).trim();
    if (value) out[key] = value;
  }
  return out;
}

/** Build export object: current mode + computed variables. */
export function buildThemeExport(mode: ThemeMode): ThemeExport {
  return {
    version: THEME_EXPORT_VERSION,
    mode,
    variables: getComputedThemeVariables(),
  };
}

/** Validate and filter imported variables to allowed keys only. */
export function validateImportVariables(variables: unknown): ThemeVariables {
  if (!variables || typeof variables !== "object") return {};
  const out: ThemeVariables = {};
  const record = variables as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    if (isThemeVariableKey(key) && typeof record[key] === "string") {
      out[key] = record[key] as string;
    }
  }
  return out;
}

/** Parse and validate a theme export from JSON. Returns null if invalid. */
export function parseThemeExport(json: string): ThemeExport | null {
  try {
    const data = JSON.parse(json) as unknown;
    if (!data || typeof data !== "object") return null;
    const obj = data as Record<string, unknown>;
    const version = typeof obj.version === "number" ? obj.version : 0;
    const mode = obj.mode === "light" || obj.mode === "dark" ? obj.mode : "dark";
    const variables = validateImportVariables(obj.variables);
    return { version, mode, variables };
  } catch {
    return null;
  }
}
