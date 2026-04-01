import { useCallback, useEffect, useRef, useState } from "react";
import {
  getOverrides,
  setOverrides,
  clearOverrides,
  buildThemeExport,
  parseThemeExport,
  getComputedThemeVariables,
} from "../../theme/theme";
import type { ThemeVariableKey } from "../../types/theme";
import {
  THEME_VARIABLE_GROUPS,
  THEME_VARIABLE_LABELS,
} from "../../types/theme";

type ThemeSettingsProps = {
  theme: "dark" | "light";
  setTheme?: (mode: "dark" | "light") => void;
  onToggleTheme?: () => void;
};

function isHexColor(value: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(value) || /^#[0-9A-Fa-f]{3}$/.test(value);
}

export default function ThemeSettings({
  theme,
  setTheme,
  onToggleTheme,
}: ThemeSettingsProps) {
  const [overrides, setOverridesState] = useState<Record<string, string>>(() =>
    getOverrides(),
  );
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState(false);
  const [pasteValue, setPasteValue] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const syncOverridesFromStorage = useCallback(() => {
    setOverridesState(getOverrides());
  }, []);

  useEffect(() => {
    syncOverridesFromStorage();
  }, [syncOverridesFromStorage]);

  const handleOverrideChange = useCallback((key: ThemeVariableKey, value: string) => {
    const next = setOverrides({ [key]: value });
    setOverridesState(next);
  }, []);

  const handleResetOne = useCallback((key: ThemeVariableKey) => {
    const next = { ...getOverrides() };
    delete next[key];
    setOverrides(next);
    setOverridesState(getOverrides());
  }, []);

  const handleResetAll = useCallback(() => {
    clearOverrides();
    setOverridesState({});
  }, []);

  const handleExport = useCallback(() => {
    const data = buildThemeExport(theme);
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mapy-theme-${theme}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [theme]);

  const applyImport = useCallback(
    (data: ReturnType<typeof parseThemeExport>) => {
      if (!data) return;
      if (data.mode && setTheme && data.mode !== theme) {
        setTheme(data.mode);
      }
      if (Object.keys(data.variables).length > 0) {
        setOverrides(data.variables);
        setOverridesState(getOverrides());
      }
      setImportError(null);
      setImportSuccess(true);
      setPasteValue("");
      setTimeout(() => setImportSuccess(false), 3000);
    },
    [theme, setTheme],
  );

  const handleImportFile = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const text = reader.result as string;
        const data = parseThemeExport(text);
        if (!data) {
          setImportError("Invalid theme JSON");
          return;
        }
        applyImport(data);
      };
      reader.onerror = () => setImportError("Failed to read file");
      reader.readAsText(file);
    },
    [applyImport],
  );

  const handleImportPaste = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const text = pasteValue.trim();
      if (!text) return;
      const data = parseThemeExport(text);
      if (!data) {
        setImportError("Invalid theme JSON");
        return;
      }
      applyImport(data);
    },
    [pasteValue, applyImport],
  );

  const getDisplayValue = (key: ThemeVariableKey): string => {
    if (overrides[key]) return overrides[key];
    if (typeof document === "undefined") return "";
    const value = getComputedStyle(document.documentElement)
      .getPropertyValue(key)
      .trim();
    return value;
  };

  return (
    <div className="settings__theme">
      <div className="settings__section">
        <span className="settings__label">Appearance</span>
        {onToggleTheme && (
          <div className="settings__theme-toggle-row">
            <button
              type="button"
              className="settings__button settings__button--edit"
              onClick={onToggleTheme}
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {theme === "dark" ? "Light mode" : "Dark mode"}
            </button>
          </div>
        )}
      </div>

      {THEME_VARIABLE_GROUPS.map((group) => (
        <div key={group.label} className="settings__section">
          <span className="settings__label">{group.label}</span>
          <div className="settings__theme-grid">
            {(group.keys as ThemeVariableKey[]).map((key) => {
              const value = getDisplayValue(key);
              const label = THEME_VARIABLE_LABELS[key] ?? key;
              const showColorPicker = isHexColor(value);
              return (
                <div key={key} className="settings__theme-row">
                  <label className="settings__theme-label" htmlFor={`theme-${key}`}>
                    {label}
                  </label>
                  <div className="settings__theme-inputs">
                    {showColorPicker && (
                      <input
                        id={`theme-${key}`}
                        type="color"
                        className="settings__theme-color"
                        value={value}
                        onChange={(e) =>
                          handleOverrideChange(key, e.target.value)
                        }
                        title={label}
                      />
                    )}
                    <input
                      type="text"
                      className="settings__input settings__theme-text"
                      value={value}
                      onChange={(e) =>
                        handleOverrideChange(key, e.target.value)}
                      placeholder="e.g. #fff or rgba(...)"
                      aria-label={label}
                    />
                    <button
                      type="button"
                      className="settings__theme-reset-one"
                      onClick={() => handleResetOne(key)}
                      title="Reset to default"
                      aria-label={`Reset ${label}`}
                    >
                      Reset
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <div className="settings__section">
        <span className="settings__label">Reset &amp; presets</span>
        <div className="settings__theme-actions">
          <button
            type="button"
            className="settings__button settings__button--edit"
            onClick={handleResetAll}
          >
            Reset all to defaults
          </button>
        </div>
      </div>

      <div className="settings__section">
        <span className="settings__label">Export / Import</span>
        <p className="settings__blocks-hint">
          Export the current theme as JSON or import a previously exported theme.
        </p>
        <div className="settings__theme-actions">
          <button
            type="button"
            className="settings__button settings__button--edit"
            onClick={handleExport}
          >
            Export theme
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            className="settings__file-input"
            onChange={handleImportFile}
            aria-label="Import theme file"
          />
          <button
            type="button"
            className="settings__button settings__button--edit"
            onClick={() => fileInputRef.current?.click()}
          >
            Import from file
          </button>
        </div>
        <form onSubmit={handleImportPaste} className="settings__theme-paste">
          <label htmlFor="theme-import-paste" className="settings__theme-paste-label">
            Or paste JSON:
          </label>
          <textarea
            id="theme-import-paste"
            className="settings__input settings__theme-textarea"
            value={pasteValue}
            onChange={(e) => {
              setPasteValue(e.target.value);
              setImportError(null);
            }}
            placeholder='{"version":1,"mode":"dark","variables":{...}}'
            rows={3}
          />
          <button type="submit" className="settings__button settings__button--edit">
            Import from paste
          </button>
        </form>
        {importError && (
          <p className="settings__error" role="alert">
            {importError}
          </p>
        )}
        {importSuccess && (
          <p className="settings__success" role="status">
            Theme imported.
          </p>
        )}
      </div>
    </div>
  );
}
