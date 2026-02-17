import type { FormEvent } from "react";
import { useEffect, useRef, useState } from "react";
import type { Profile } from "../../types/profile";
import {
  type Library,
  type AddLibraryInput,
  type LibraryStatus,
  fetchLibraryStatus,
} from "../../api/libraries";

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
  onPullLibrary: (libId: string) => Promise<void>;
  onPushLibrary: (libId: string) => Promise<void>;
  onDeleteLibrary: (libId: string) => Promise<void>;
  onDeleteProfile: (profileName: string) => Promise<void>;
  deleteProfileError: string;
  isDeletingProfile: boolean;
};

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
  onPullLibrary,
  onPushLibrary,
  onDeleteLibrary,
  onDeleteProfile,
  deleteProfileError,
  isDeletingProfile,
}: SettingsPanelProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [addLibName, setAddLibName] = useState("");
  const [addLibUrl, setAddLibUrl] = useState("");
  const [addLibRef, setAddLibRef] = useState("main");
  const [addLibAuth, setAddLibAuth] = useState("");
  const [isAddingLibrary, setIsAddingLibrary] = useState(false);
  const [libraryError, setLibraryError] = useState<string | null>(null);
  const [libraryLoadingId, setLibraryLoadingId] = useState<string | null>(null);
  const [showAddLibrary, setShowAddLibrary] = useState(false);
  const [libraryStatusByLibId, setLibraryStatusByLibId] = useState<
    Record<string, LibraryStatus | null>
  >({});

  useEffect(() => {
    if (!selectedProfile) return;
    const remoteLibs = libraries.filter((l) => l.type === "remote");
    for (const lib of remoteLibs) {
      fetchLibraryStatus(selectedProfile, lib.id)
        .then((status) => {
          setLibraryStatusByLibId((prev) => ({ ...prev, [lib.id]: status }));
        })
        .catch(() => {
          setLibraryStatusByLibId((prev) => ({ ...prev, [lib.id]: null }));
        });
    }
    if (remoteLibs.length === 0) {
      setLibraryStatusByLibId({});
    }
  }, [selectedProfile, libraries]);

  const selectedProfileData =
    profiles.find((p) => p.name === selectedProfile) ?? null;
  const subprofiles = selectedProfileData?.subProfiles ?? [];

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

  if (!selectedProfileData) {
    return (
      <section className="panel settings">
        <header className="settings__header">
          <h2>Settings</h2>
        </header>
        <p className="settings__empty">Select a profile to view settings.</p>
      </section>
    );
  }

  return (
    <section className="panel settings">
      <header className="settings__header">
        <h2>Settings</h2>
      </header>

      <form className="settings__form" onSubmit={onSave}>
        <div className="settings__section">
          <label className="settings__label" htmlFor="settings-profile-name">
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
          <label className="settings__label" htmlFor="settings-base-url">
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
                <div key={sub.name} className="settings__subprofile-row">
                  <span className="settings__subprofile-name">{sub.name}</span>
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
              {showAddLibrary ? "Cancel" : "Add remote library"}
            </button>
          </div>
          <p className="settings__blocks-hint">
            Local library stores blocks in this profile. Add remote libraries
            from a git repo (with a <code>blocks/</code> folder of JSON files).
          </p>
          {libraryError ? (
            <div className="settings__error">{libraryError}</div>
          ) : null}
          <div className="settings__subprofile-list">
            {libraries.map((lib) => (
              <div key={lib.id} className="settings__subprofile-row">
                <div>
                  <span className="settings__subprofile-name">
                    {lib.name}
                    {lib.type === "remote" ? (
                      <span className="settings__library-meta">
                        {" "}
                        — {lib.gitUrl ?? ""}
                        {lib.gitRef ? ` (${lib.gitRef})` : ""}
                      </span>
                    ) : null}
                    {lib.type === "remote" && libraryStatusByLibId[lib.id] ? (
                      <span className="settings__library-status">
                        {" · "}
                        {(() => {
                          const s = libraryStatusByLibId[lib.id]!;
                          if (
                            !s.behindCount &&
                            !s.aheadCount &&
                            !s.hasUncommittedChanges
                          ) {
                            return "Up to date";
                          }
                          return [
                            s.hasUncommittedChanges && "Uncommitted",
                            s.aheadCount > 0 && `${s.aheadCount} to push`,
                            s.behindCount > 0 && `${s.behindCount} to pull`,
                          ]
                            .filter(Boolean)
                            .join(", ");
                        })()}
                      </span>
                    ) : null}
                  </span>
                </div>
                <div className="settings__subprofile-actions">
                  {lib.type === "remote" ? (
                    <>
                      <button
                        className="settings__button settings__button--edit"
                        type="button"
                        disabled={libraryLoadingId !== null}
                        onClick={async () => {
                          setLibraryLoadingId(lib.id);
                          setLibraryError(null);
                          try {
                            await onPullLibrary(lib.id);
                            const status = await fetchLibraryStatus(
                              selectedProfile,
                              lib.id,
                            );
                            setLibraryStatusByLibId((prev) => ({
                              ...prev,
                              [lib.id]: status,
                            }));
                          } catch (e) {
                            setLibraryError(
                              e instanceof Error ? e.message : "Pull failed",
                            );
                          } finally {
                            setLibraryLoadingId(null);
                          }
                        }}
                      >
                        {libraryLoadingId === lib.id ? "Pulling…" : "Pull"}
                      </button>
                      <button
                        className="settings__button settings__button--edit"
                        type="button"
                        disabled={libraryLoadingId !== null}
                        onClick={async () => {
                          setLibraryLoadingId(lib.id);
                          setLibraryError(null);
                          try {
                            await onPushLibrary(lib.id);
                            const status = await fetchLibraryStatus(
                              selectedProfile,
                              lib.id,
                            );
                            setLibraryStatusByLibId((prev) => ({
                              ...prev,
                              [lib.id]: status,
                            }));
                          } catch (e) {
                            setLibraryError(
                              e instanceof Error ? e.message : "Push failed",
                            );
                          } finally {
                            setLibraryLoadingId(null);
                          }
                        }}
                      >
                        {libraryLoadingId === lib.id ? "Pushing…" : "Push"}
                      </button>
                      <button
                        className="settings__button settings__button--danger"
                        type="button"
                        disabled={libraryLoadingId !== null}
                        onClick={async () => {
                          if (
                            !window.confirm(
                              `Remove remote library "${lib.name}"? The clone will be deleted.`,
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
                                : "Delete failed",
                            );
                          } finally {
                            setLibraryLoadingId(null);
                          }
                        }}
                      >
                        Delete
                      </button>
                    </>
                  ) : (
                    <span className="settings__library-badge">Local</span>
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
              <div className="settings__param-row">
                <input
                  className="settings__input"
                  type="text"
                  value={addLibUrl}
                  onChange={(e) => setAddLibUrl(e.target.value)}
                  placeholder="Git URL (e.g. https://github.com/owner/repo)"
                />
              </div>
              <div className="settings__param-row">
                <input
                  className="settings__input"
                  type="text"
                  value={addLibRef}
                  onChange={(e) => setAddLibRef(e.target.value)}
                  placeholder="Branch (default: main)"
                />
              </div>
              <div className="settings__param-row">
                <input
                  className="settings__input"
                  type="password"
                  value={addLibAuth}
                  onChange={(e) => setAddLibAuth(e.target.value)}
                  placeholder="Auth token (optional)"
                  autoComplete="off"
                />
              </div>
              <button
                className="settings__button settings__button--edit"
                type="button"
                disabled={isAddingLibrary}
                onClick={async () => {
                  const name = addLibName.trim();
                  const gitUrl = addLibUrl.trim();
                  if (!name || !gitUrl) {
                    setLibraryError("Name and Git URL are required.");
                    return;
                  }
                  setIsAddingLibrary(true);
                  setLibraryError(null);
                  try {
                    await onAddLibrary({
                      name,
                      type: "remote",
                      gitUrl,
                      gitRef: addLibRef.trim() || undefined,
                      auth: addLibAuth.trim() || undefined,
                    });
                    setAddLibName("");
                    setAddLibUrl("");
                    setAddLibRef("main");
                    setAddLibAuth("");
                    setShowAddLibrary(false);
                  } catch (e) {
                    setLibraryError(
                      e instanceof Error ? e.message : "Add library failed",
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

        <div className="settings__section settings__section--danger">
          <span className="settings__label">Delete profile</span>
          <p className="settings__blocks-hint">
            Permanently remove this profile and all its blocks, subprofiles, and
            requests.
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
      </form>
    </section>
  );
};

export default SettingsPanel;
