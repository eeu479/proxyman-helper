import type { FormEvent } from "react";
import { useEffect, useRef, useState, useCallback } from "react";
import type { Profile } from "../../types/profile";
import {
  type Library,
  type AddLibraryInput,
} from "../../api/libraries";
import {
  type ProxyStatus,
  getProxyStatus,
  installCertSimulator,
  installCertMacOS,
  getCertDownloadUrl,
  getMobileconfigUrl,
} from "../../api/proxy";
import ThemeSettings from "./ThemeSettings";

const SETTINGS_SECTION_KEY = "settingsSection";

type SectionId =
  | "layout"
  | "theme"
  | "proxy"
  | "profile"
  | "libraries"
  | "blocks"
  | "danger";

type ProxyAction = "simulator" | "macos";

type SettingsPanelProps = {
  profiles: Profile[];
  selectedProfile: string;
  editProfileName: string;
  editProfileBaseUrl: string;
  editProfileParams: string[];
  editProfileParamInput: string;
  isUpdatingProfile: boolean;
  updateProfileError: string;
  onChangeName: (value: string) => void;
  onChangeBaseUrl: (value: string) => void;
  onChangeParamInput: (value: string) => void;
  onAddParam: () => void;
  onRemoveParam: (value: string) => void;
  onSave: (event: FormEvent<HTMLFormElement>) => void;
  onAddSubprofile: () => void;
  onEditSubprofile: (profileName: string, subprofileName: string) => void;
  onDeleteSubprofile: (profileName: string, subprofileName: string) => void;
  onExportBlocks: () => void;
  onImportBlocks: (file: File) => Promise<void>;
  importBlocksMessage: string | null;
  libraries: Library[];
  onAddLibrary: (input: AddLibraryInput) => Promise<void>;
  onDeleteLibrary: (libId: string) => Promise<void>;
  onDeleteProfile: (profileName: string) => Promise<void>;
  deleteProfileError: string;
  isDeletingProfile: boolean;
  onChooseFolder?: () => Promise<string | null>;
  builderLayout?: "tree" | "grid";
  onBuilderLayoutChange?: (layout: "tree" | "grid") => void;
  theme?: "dark" | "light";
  setTheme?: (mode: "dark" | "light") => void;
  onToggleTheme?: () => void;
};

const SECTIONS: { id: SectionId; label: string }[] = [
  { id: "layout", label: "Layout" },
  { id: "theme", label: "Theme" },
  { id: "proxy", label: "Proxy" },
  { id: "profile", label: "Profile" },
  { id: "libraries", label: "Libraries" },
  { id: "blocks", label: "Blocks" },
  { id: "danger", label: "Delete profile" },
];

const SettingsPanel = ({
  profiles,
  selectedProfile,
  editProfileName,
  editProfileBaseUrl,
  editProfileParams,
  editProfileParamInput,
  isUpdatingProfile,
  updateProfileError,
  onChangeName,
  onChangeBaseUrl,
  onChangeParamInput,
  onAddParam,
  onRemoveParam,
  onSave,
  onAddSubprofile,
  onEditSubprofile,
  onDeleteSubprofile,
  onExportBlocks,
  onImportBlocks,
  importBlocksMessage,
  libraries,
  onAddLibrary,
  onDeleteLibrary,
  onDeleteProfile,
  deleteProfileError,
  isDeletingProfile,
  onChooseFolder,
  builderLayout = "tree",
  onBuilderLayoutChange,
  theme = "dark",
  setTheme,
  onToggleTheme,
}: SettingsPanelProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [addLibName, setAddLibName] = useState("");
  const [addLibFolderPath, setAddLibFolderPath] = useState("");
  const [isAddingLibrary, setIsAddingLibrary] = useState(false);
  const [libraryError, setLibraryError] = useState<string | null>(null);
  const [libraryLoadingId, setLibraryLoadingId] = useState<string | null>(null);
  const [showAddLibrary, setShowAddLibrary] = useState(false);

  const selectedProfileData =
    profiles.find((p) => p.name === selectedProfile) ?? null;
  const subprofiles = selectedProfileData?.subProfiles ?? [];
  const hasProfile = !!selectedProfileData;

  const [activeSection, setActiveSection] = useState<SectionId>(() => {
    const saved = localStorage.getItem(SETTINGS_SECTION_KEY);
    if (saved && SECTIONS.some((s) => s.id === saved)) return saved as SectionId;
    if (saved === "parameters" || saved === "subprofiles") return "profile";
    return "layout";
  });

  const sectionsWithAvailability = SECTIONS.map((s) => ({
    ...s,
    available:
      s.id === "layout" ||
      s.id === "theme" ||
      s.id === "proxy" ||
      hasProfile,
  }));

  const visibleSections = sectionsWithAvailability.filter((s) => s.available);
  const currentSectionValid =
    visibleSections.some((s) => s.id === activeSection);

  useEffect(() => {
    if (!currentSectionValid) {
      setActiveSection("layout");
    }
  }, [currentSectionValid]);

  useEffect(() => {
    localStorage.setItem(SETTINGS_SECTION_KEY, activeSection);
  }, [activeSection]);

  // Proxy state
  const [proxyStatus, setProxyStatus] = useState<ProxyStatus | null>(null);
  const [proxyLoading, setProxyLoading] = useState<ProxyAction | null>(null);
  const [proxyMessage, setProxyMessage] = useState<{
    tone: "error" | "success";
    text: string;
  } | null>(null);
  const [proxyExpanded, setProxyExpanded] = useState<"ios" | "android" | "general">("ios");

  const fetchProxy = useCallback(async () => {
    try {
      const status = await getProxyStatus();
      setProxyStatus(status);
    } catch {
      setProxyStatus(null);
    }
  }, []);

  useEffect(() => {
    if (activeSection === "proxy") {
      fetchProxy();
    }
  }, [activeSection, fetchProxy]);

  const runProxyInstall = useCallback(
    async (
      action: ProxyAction,
      fn: () => Promise<{ ok: boolean; message?: string; error?: string }>,
      fallback: string,
    ) => {
      setProxyLoading(action);
      setProxyMessage(null);
      try {
        const res = await fn();
        setProxyMessage({
          tone: res.ok ? "success" : "error",
          text: res.ok ? (res.message ?? fallback) : `Error: ${res.error ?? "Install failed"}`,
        });
      } catch (e) {
        setProxyMessage({
          tone: "error",
          text: e instanceof Error ? e.message : "Install failed",
        });
      } finally {
        setProxyLoading(null);
      }
    },
    [],
  );

  const copyProxyValue = useCallback(async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setProxyMessage({ tone: "success", text: `${label} copied` });
    } catch {
      setProxyMessage({
        tone: "error",
        text: "Unable to copy to clipboard",
      });
    }
  }, []);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImportBlocks(file).finally(() => {
        e.target.value = "";
      });
    }
  };

  return (
    <section className="panel settings">
      <header className="settings__header">
        <h2>Settings</h2>
      </header>

      <div className="settings__layout">
        <nav className="settings__sidebar" aria-label="Settings sections">
          {visibleSections.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`settings__sidebar-item ${activeSection === s.id ? "settings__sidebar-item--active" : ""}`}
              onClick={() => setActiveSection(s.id)}
            >
              {s.label}
            </button>
          ))}
        </nav>

        <div className="settings__content">
          {activeSection === "theme" && (
            <ThemeSettings
              theme={theme}
              setTheme={setTheme}
              onToggleTheme={onToggleTheme}
            />
          )}

          {activeSection === "layout" && (
            <>
              {onBuilderLayoutChange ? (
                <div className="settings__section">
                  <span className="settings__label">Mocks layout</span>
                  <p className="settings__blocks-hint">
                    Choose how the library and flow appear on the Mocks page.
                  </p>
                  <div className="settings__layout-toggle">
                    <label className="settings__layout-option">
                      <input
                        type="radio"
                        name="builderLayout"
                        value="tree"
                        checked={builderLayout === "tree"}
                        onChange={() => onBuilderLayoutChange("tree")}
                      />
                      <span>Tree</span>
                      <span className="settings__layout-desc">
                        Library as folders, two columns
                      </span>
                    </label>
                    <label className="settings__layout-option">
                      <input
                        type="radio"
                        name="builderLayout"
                        value="grid"
                        checked={builderLayout === "grid"}
                        onChange={() => onBuilderLayoutChange("grid")}
                      />
                      <span>Grid (classic)</span>
                      <span className="settings__layout-desc">
                        Category groups, stacked panels
                      </span>
                    </label>
                  </div>
                </div>
              ) : null}
              {!hasProfile && (
                <p className="settings__empty">
                  Select a profile to view settings.
                </p>
              )}
            </>
          )}

          {activeSection === "proxy" && (
            <div className="settings__proxy">
              <div className="settings__proxy-grid">
                <div className="settings__proxy-card">
                  <span className="settings__label">HTTPS Proxy</span>
                  {proxyStatus ? (
                    <div className="settings__proxy-status">
                      <div className="settings__proxy-status-row">
                        <span className="settings__proxy-status-dot settings__proxy-status-dot--active" />
                        <span>
                          Running on{" "}
                          <code className="settings__code">
                            {proxyStatus.localIp}:{proxyStatus.port}
                          </code>
                        </span>
                      </div>
                      <div className="settings__proxy-status-row">
                        <span className="settings__text-muted">API:</span>
                        <code className="settings__code">
                          {proxyStatus.localIp}:{proxyStatus.apiPort}
                        </code>
                      </div>
                    </div>
                  ) : (
                    <p className="settings__blocks-hint">
                      Unable to fetch proxy status.
                    </p>
                  )}
                  {proxyStatus ? (
                    <div className="settings__proxy-actions">
                      <button
                        className="settings__button settings__button--edit"
                        type="button"
                        onClick={() =>
                          copyProxyValue(
                            `${proxyStatus.localIp}:${proxyStatus.port}`,
                            "Proxy endpoint",
                          )
                        }
                      >
                        Copy Proxy Endpoint
                      </button>
                      <button
                        className="settings__button settings__button--edit"
                        type="button"
                        onClick={() =>
                          copyProxyValue(
                            `http://${proxyStatus.localIp}:${proxyStatus.apiPort}/api/proxy/ca.pem`,
                            "Local certificate URL",
                          )
                        }
                      >
                        Copy Local Cert URL
                      </button>
                    </div>
                  ) : null}
                </div>

                <div className="settings__proxy-card">
                  <span className="settings__label">Certificate Assets</span>
                  <p className="settings__blocks-hint">
                    Download and distribute certificate files used for HTTPS interception.
                  </p>
                  <div className="settings__proxy-actions">
                    <a
                      className="settings__button settings__button--edit"
                      href={getCertDownloadUrl()}
                      download="mapy_ca.pem"
                    >
                      Download CA Certificate
                    </a>
                    <a
                      className="settings__button settings__button--edit"
                      href={getMobileconfigUrl()}
                      download="mapy_ca.mobileconfig"
                    >
                      Download iOS Profile
                    </a>
                  </div>
                </div>

                <div className="settings__proxy-card">
                  <span className="settings__label">Quick Install</span>
                  <p className="settings__blocks-hint">
                    Automated install actions for local development targets.
                  </p>
                  <div className="settings__proxy-actions">
                    <button
                      className="settings__button settings__button--edit"
                      type="button"
                      disabled={proxyLoading !== null}
                      onClick={() =>
                        runProxyInstall(
                          "simulator",
                          installCertSimulator,
                          "Certificate installed on iOS Simulator",
                        )
                      }
                    >
                      {proxyLoading === "simulator"
                        ? "Installing on Simulator..."
                        : "Install on iOS Simulator"}
                    </button>
                    <button
                      className="settings__button settings__button--edit"
                      type="button"
                      disabled={proxyLoading !== null}
                      onClick={() =>
                        runProxyInstall(
                          "macos",
                          installCertMacOS,
                          "Certificate installed on macOS keychain",
                        )
                      }
                    >
                      {proxyLoading === "macos"
                        ? "Installing on macOS..."
                        : "Install on macOS"}
                    </button>
                  </div>
                </div>
              </div>

              {proxyMessage ? (
                <div
                  className={
                    proxyMessage.tone === "error"
                      ? "settings__error"
                      : "settings__success"
                  }
                >
                  {proxyMessage.text}
                </div>
              ) : null}

              <div className="settings__section">
                <span className="settings__label">Device Setup Guides</span>
                <div className="settings__proxy-guides-nav">
                  <button
                    type="button"
                    className={`settings__proxy-guide-tab ${proxyExpanded === "ios" ? "settings__proxy-guide-tab--active" : ""}`}
                    onClick={() => setProxyExpanded("ios")}
                  >
                    iOS Device
                  </button>
                  <button
                    type="button"
                    className={`settings__proxy-guide-tab ${proxyExpanded === "android" ? "settings__proxy-guide-tab--active" : ""}`}
                    onClick={() => setProxyExpanded("android")}
                  >
                    Android Emulator
                  </button>
                  <button
                    type="button"
                    className={`settings__proxy-guide-tab ${proxyExpanded === "general" ? "settings__proxy-guide-tab--active" : ""}`}
                    onClick={() => setProxyExpanded("general")}
                  >
                    General
                  </button>
                </div>

                {proxyExpanded === "ios" && proxyStatus ? (
                  <div className="settings__proxy-instructions">
                    <ol>
                      <li>
                        Download and install profile:
                        <code className="settings__code">
                          http://{proxyStatus.localIp}:{proxyStatus.apiPort}
                          /api/proxy/ca.mobileconfig
                        </code>
                      </li>
                      <li>
                        Install in Settings {">"} General {">"} VPN & Device Management.
                      </li>
                      <li>
                        Enable full trust in Settings {">"} General {">"} About {">"} Certificate Trust Settings.
                      </li>
                      <li>
                        Set Wi-Fi proxy to Manual:
                        <code className="settings__code">
                          {proxyStatus.localIp}:{proxyStatus.port}
                        </code>
                      </li>
                    </ol>
                  </div>
                ) : null}
                {proxyExpanded === "android" && proxyStatus ? (
                  <div className="settings__proxy-instructions">
                    <ol>
                      <li>
                        Download certificate:
                        <code className="settings__code">
                          http://{proxyStatus.localIp}:{proxyStatus.apiPort}/api/proxy/ca.pem
                        </code>
                      </li>
                      <li>
                        Push with adb:
                        <code className="settings__code">
                          adb push mapy_ca.pem /sdcard/
                        </code>
                      </li>
                      <li>
                        Install from device settings: Security {">"} Install from storage.
                      </li>
                      <li>
                        Set emulator proxy:
                        <code className="settings__code">
                          {proxyStatus.localIp}:{proxyStatus.port}
                        </code>
                      </li>
                    </ol>
                  </div>
                ) : null}
                {proxyExpanded === "general" && proxyStatus ? (
                  <div className="settings__proxy-instructions">
                    <ol>
                      <li>
                        Configure client HTTP(S) proxy:
                        <code className="settings__code">
                          {proxyStatus.localIp}:{proxyStatus.port}
                        </code>
                      </li>
                      <li>
                        Install CA certificate from:
                        <code className="settings__code">
                          http://{proxyStatus.localIp}:{proxyStatus.apiPort}/api/proxy/ca.pem
                        </code>
                      </li>
                      <li>
                        Enable certificate trust in the target OS/browser certificate store.
                      </li>
                    </ol>
                  </div>
                ) : null}
              </div>
            </div>
          )}

          {hasProfile && (
            <form className="settings__form" onSubmit={onSave}>
              {activeSection === "profile" && (
                <>
                  <div className="settings__section">
                    <label
                      className="settings__label"
                      htmlFor="settings-profile-name"
                    >
                      Profile Name
                    </label>
                    <input
                      id="settings-profile-name"
                      className="settings__input"
                      type="text"
                      value={editProfileName}
                      onChange={(e) => onChangeName(e.target.value)}
                      placeholder="Profile name"
                      disabled={isUpdatingProfile}
                      required
                    />
                  </div>
                  <div className="settings__section">
                    <label
                      className="settings__label"
                      htmlFor="settings-base-url"
                    >
                      Base URL
                    </label>
                    <input
                      id="settings-base-url"
                      className="settings__input"
                      type="text"
                      value={editProfileBaseUrl}
                      onChange={(e) => onChangeBaseUrl(e.target.value)}
                      placeholder="https://api.example.com"
                      disabled={isUpdatingProfile}
                    />
                  </div>
                  <div className="settings__section">
                    <span className="settings__label">Parameters</span>
                    <div className="settings__param-row">
                      <input
                        className="settings__input"
                        type="text"
                        value={editProfileParamInput}
                        onChange={(e) => onChangeParamInput(e.target.value)}
                        placeholder="Add parameter"
                        disabled={isUpdatingProfile}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            onAddParam();
                          }
                        }}
                      />
                      <button
                        className="settings__button settings__button--edit"
                        type="button"
                        onClick={onAddParam}
                        disabled={isUpdatingProfile}
                      >
                        Add
                      </button>
                    </div>
                    <div className="settings__chips">
                      {editProfileParams.length === 0 ? (
                        <span className="settings__chip settings__chip--empty">
                          No parameters defined.
                        </span>
                      ) : (
                        editProfileParams.map((param) => (
                          <span key={param} className="settings__chip">
                            {param}
                            <button
                              type="button"
                              className="settings__chip-remove"
                              onClick={() => onRemoveParam(param)}
                              aria-label={`Remove ${param}`}
                            >
                              ✕
                            </button>
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                  <div className="settings__section">
                    <div className="settings__section-header">
                      <span className="settings__label">Subprofiles</span>
                      <button
                        className="settings__button settings__button--edit"
                        type="button"
                        onClick={onAddSubprofile}
                      >
                        Add Subprofile
                      </button>
                    </div>
                    <div className="settings__subprofile-list">
                      {subprofiles.length === 0 ? (
                        <p className="settings__empty">No subprofiles yet.</p>
                      ) : (
                        subprofiles.map((sub) => (
                          <div
                            key={sub.name}
                            className="settings__subprofile-row"
                          >
                            <span className="settings__subprofile-name">
                              {sub.name}
                            </span>
                            <div className="settings__subprofile-actions">
                              <button
                                className="settings__button settings__button--edit"
                                type="button"
                                onClick={() =>
                                  onEditSubprofile(selectedProfile, sub.name)
                                }
                              >
                                Edit
                              </button>
                              <button
                                className="settings__button settings__button--danger"
                                type="button"
                                onClick={() =>
                                  onDeleteSubprofile(selectedProfile, sub.name)
                                }
                                aria-label={`Delete ${sub.name}`}
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                  {updateProfileError ? (
                    <div className="settings__error">{updateProfileError}</div>
                  ) : null}
                  {deleteProfileError ? (
                    <div className="settings__error">{deleteProfileError}</div>
                  ) : null}
                  <div className="settings__actions">
                    <button
                      className="settings__save"
                      type="submit"
                      disabled={isUpdatingProfile}
                    >
                      {isUpdatingProfile ? "Saving..." : "Save"}
                    </button>
                  </div>
                </>
              )}

              {activeSection === "libraries" && (
                <div className="settings__section">
                  <div className="settings__section-header">
                    <span className="settings__label">Libraries</span>
                    <button
                      className="settings__button settings__button--edit"
                      type="button"
                      onClick={() => {
                        setShowAddLibrary((v) => !v);
                        setLibraryError(null);
                      }}
                    >
                      {showAddLibrary
                        ? "Cancel"
                        : "Add folder library"}
                    </button>
                  </div>
                  <p className="settings__blocks-hint">
                    Local library stores blocks in this profile. Add libraries
                    from a folder on your computer (with a{" "}
                    <code>blocks/</code> subfolder of JSON files; the folder
                    will be created if missing).
                  </p>
                  {libraryError ? (
                    <div className="settings__error">{libraryError}</div>
                  ) : null}
                  <div className="settings__subprofile-list">
                    {libraries.map((lib) => (
                      <div
                        key={lib.id}
                        className="settings__subprofile-row"
                      >
                        <div>
                          <span className="settings__subprofile-name">
                            {lib.name}
                            {lib.type === "remote" && lib.folderPath ? (
                              <span className="settings__library-meta">
                                {" "}
                                — {lib.folderPath}
                              </span>
                            ) : null}
                          </span>
                        </div>
                        <div className="settings__subprofile-actions">
                          {lib.type === "remote" ? (
                            <button
                              className="settings__button settings__button--danger"
                              type="button"
                              disabled={libraryLoadingId !== null}
                              onClick={async () => {
                                if (
                                  !window.confirm(
                                    `Remove library "${lib.name}"? The folder and its files will not be deleted.`,
                                  )
                                ) {
                                  return;
                                }
                                setLibraryLoadingId(lib.id);
                                setLibraryError(null);
                                try {
                                  await onDeleteLibrary(lib.id);
                                } catch (e) {
                                  setLibraryError(
                                    e instanceof Error
                                      ? e.message
                                      : "Remove failed",
                                  );
                                } finally {
                                  setLibraryLoadingId(null);
                                }
                              }}
                            >
                              Remove
                            </button>
                          ) : (
                            <span className="settings__library-badge">
                              Local
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  {showAddLibrary ? (
                    <div className="settings__library-add">
                      <div className="settings__param-row">
                        <input
                          className="settings__input"
                          type="text"
                          value={addLibName}
                          onChange={(e) => setAddLibName(e.target.value)}
                          placeholder="Library name"
                        />
                      </div>
                      <div className="settings__param-row settings__param-row--folder">
                        <input
                          className="settings__input"
                          type="text"
                          value={addLibFolderPath}
                          onChange={(e) =>
                            setAddLibFolderPath(e.target.value)
                          }
                          placeholder="Folder path (absolute)"
                        />
                        {onChooseFolder ? (
                          <button
                            className="settings__button settings__button--edit"
                            type="button"
                            onClick={async () => {
                              setLibraryError(null);
                              try {
                                const path = await onChooseFolder();
                                if (path != null) setAddLibFolderPath(path);
                              } catch (e) {
                                setLibraryError(
                                  e instanceof Error
                                    ? e.message
                                    : "Could not open folder dialog",
                                );
                              }
                            }}
                          >
                            Choose folder
                          </button>
                        ) : null}
                      </div>
                      <button
                        className="settings__button settings__button--edit"
                        type="button"
                        disabled={isAddingLibrary}
                        onClick={async () => {
                          const name = addLibName.trim();
                          const folderPath = addLibFolderPath.trim();
                          if (!name || !folderPath) {
                            setLibraryError(
                              "Name and folder path are required.",
                            );
                            return;
                          }
                          setIsAddingLibrary(true);
                          setLibraryError(null);
                          try {
                            await onAddLibrary({
                              name,
                              type: "remote",
                              folderPath,
                            });
                            setAddLibName("");
                            setAddLibFolderPath("");
                            setShowAddLibrary(false);
                          } catch (e) {
                            setLibraryError(
                              e instanceof Error
                                ? e.message
                                : "Add library failed",
                            );
                          } finally {
                            setIsAddingLibrary(false);
                          }
                        }}
                      >
                        {isAddingLibrary ? "Adding…" : "Add library"}
                      </button>
                    </div>
                  ) : null}
                </div>
              )}

              {activeSection === "blocks" && (
                <div className="settings__section">
                  <span className="settings__label">Blocks</span>
                  <p className="settings__blocks-hint">
                    Export or import the library for the current profile.
                  </p>
                  <div className="settings__blocks-actions">
                    <button
                      className="settings__button settings__button--edit"
                      type="button"
                      onClick={onExportBlocks}
                    >
                      Export library
                    </button>
                    <button
                      className="settings__button settings__button--edit"
                      type="button"
                      onClick={handleImportClick}
                    >
                      Import blocks
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".json"
                      className="settings__file-input"
                      aria-hidden
                      tabIndex={-1}
                      onChange={handleFileChange}
                    />
                  </div>
                  {importBlocksMessage ? (
                    <div
                      className={
                        importBlocksMessage.startsWith("Invalid") ||
                        importBlocksMessage.startsWith("Import failed")
                          ? "settings__error"
                          : "settings__success"
                      }
                    >
                      {importBlocksMessage}
                    </div>
                  ) : null}
                </div>
              )}

              {activeSection === "danger" && (
                <div className="settings__section settings__section--danger">
                  <span className="settings__label">Delete profile</span>
                  <p className="settings__blocks-hint">
                    Permanently remove this profile and all its blocks,
                    subprofiles, and requests.
                  </p>
                  <button
                    className="settings__button settings__button--danger"
                    type="button"
                    disabled={isDeletingProfile}
                    onClick={() => {
                      if (
                        selectedProfileData &&
                        window.confirm(
                          `Delete profile "${selectedProfileData.name}"? This cannot be undone.`,
                        )
                      ) {
                        onDeleteProfile(selectedProfile);
                      }
                    }}
                  >
                    {isDeletingProfile ? "Deleting..." : "Delete profile"}
                  </button>
                </div>
              )}
            </form>
          )}
        </div>
      </div>
    </section>
  );
};

export default SettingsPanel;
