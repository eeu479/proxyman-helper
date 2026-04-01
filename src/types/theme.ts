export type ThemeMode = "dark" | "light";

export type ThemeVariables = Record<string, string>;

export type ThemeExport = {
  version: number;
  mode: ThemeMode;
  variables: ThemeVariables;
};

export const THEME_EXPORT_VERSION = 1;

/** All theme CSS variable names from index.css (--color-*). Used for validation and UI iteration. */
export const THEME_VARIABLE_KEYS = [
  "--color-body-bg",
  "--color-text-primary",
  "--color-text-strong",
  "--color-text-muted",
  "--color-text-subtle",
  "--color-text-accent",
  "--color-surface-panel",
  "--color-surface-panel-strong",
  "--color-surface-muted",
  "--color-surface-card",
  "--color-surface-overlay",
  "--color-surface-input",
  "--color-surface-modal",
  "--color-border-strong",
  "--color-border-muted",
  "--color-border-soft",
  "--color-border-dashed",
  "--color-border-ghost",
  "--color-accent",
  "--color-accent-contrast",
  "--color-accent-soft",
  "--color-accent-border",
  "--color-danger",
  "--color-info",
  "--color-success",
  "--color-warning",
  "--color-danger-soft",
] as const;

export type ThemeVariableKey = (typeof THEME_VARIABLE_KEYS)[number];

const THEME_VARIABLE_KEYS_SET = new Set<string>(THEME_VARIABLE_KEYS);

export function isThemeVariableKey(key: string): key is ThemeVariableKey {
  return THEME_VARIABLE_KEYS_SET.has(key);
}

/** Human-readable labels for theme variables, grouped by prefix. */
export const THEME_VARIABLE_LABELS: Record<string, string> = {
  "--color-body-bg": "Body background",
  "--color-text-primary": "Text primary",
  "--color-text-strong": "Text strong",
  "--color-text-muted": "Text muted",
  "--color-text-subtle": "Text subtle",
  "--color-text-accent": "Text accent",
  "--color-surface-panel": "Surface panel",
  "--color-surface-panel-strong": "Surface panel strong",
  "--color-surface-muted": "Surface muted",
  "--color-surface-card": "Surface card",
  "--color-surface-overlay": "Surface overlay",
  "--color-surface-input": "Surface input",
  "--color-surface-modal": "Surface modal",
  "--color-border-strong": "Border strong",
  "--color-border-muted": "Border muted",
  "--color-border-soft": "Border soft",
  "--color-border-dashed": "Border dashed",
  "--color-border-ghost": "Border ghost",
  "--color-accent": "Accent",
  "--color-accent-contrast": "Accent contrast",
  "--color-accent-soft": "Accent soft",
  "--color-accent-border": "Accent border",
  "--color-danger": "Danger",
  "--color-info": "Info",
  "--color-success": "Success",
  "--color-warning": "Warning",
  "--color-danger-soft": "Danger soft",
};

/** Group variable keys by category for the Settings UI. */
export const THEME_VARIABLE_GROUPS: {
  label: string;
  keys: readonly ThemeVariableKey[];
}[] = [
  {
    label: "Background & text",
    keys: [
      "--color-body-bg",
      "--color-text-primary",
      "--color-text-strong",
      "--color-text-muted",
      "--color-text-subtle",
      "--color-text-accent",
    ],
  },
  {
    label: "Surfaces",
    keys: [
      "--color-surface-panel",
      "--color-surface-panel-strong",
      "--color-surface-muted",
      "--color-surface-card",
      "--color-surface-overlay",
      "--color-surface-input",
      "--color-surface-modal",
    ],
  },
  {
    label: "Borders",
    keys: [
      "--color-border-strong",
      "--color-border-muted",
      "--color-border-soft",
      "--color-border-dashed",
      "--color-border-ghost",
    ],
  },
  {
    label: "Accent",
    keys: [
      "--color-accent",
      "--color-accent-contrast",
      "--color-accent-soft",
      "--color-accent-border",
    ],
  },
  {
    label: "Semantic",
    keys: [
      "--color-danger",
      "--color-info",
      "--color-success",
      "--color-warning",
      "--color-danger-soft",
    ],
  },
];
