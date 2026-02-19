import type { FormEvent } from "react";
import { useRef, useState } from "react";
import type { Profile } from "../../types/profile";
import {
  type Library,
  type AddLibraryInput,
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
  onDeleteLibrary: (libId: string) => Promise<void>;
  onDeleteProfile: (profileName: string) => Promise<void>;
  deleteProfileError: string;
  isDeletingProfile: boolean;
  onChooseFolder?: () => Promise<string | null>;
  builderLayout?: "tree" | "grid";
  onBuilderLayoutChange?: (layout: "tree" | "grid") => void;
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
  onDeleteLibrary,
  onDeleteProfile,
  deleteProfileError,
  isDeletingProfile,
  onChooseFolder,
  builderLayout = "tree",
  onBuilderLayoutChange,
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
        {onBuilderLayoutChange ? (
          <div className="settings__section">
            <span className="settings__label">Builder layout</span>
            <p className="settings__blocks-hint">
              Choose how the library and flow appear on the builder page.
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
                <span className="settings__layout-desc">Library as folders, two columns</span>
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
                <span className="settings__layout-desc">Category groups, stacked panels</span>
              </label>
            </div>
          </div>
        ) : null}
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
        {onBuilderLayoutChange ? (
          <div className="settings__section">
            <span className="settings__label">Builder layout</span>
            <p className="settings__blocks-hint">
              Choose how the library and flow appear on the builder page.
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
                <span className="settings__layout-desc">Library as folders, two columns</span>
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
                <span className="settings__layout-desc">Category groups, stacked panels</span>
              </label>
            </div>
          </div>
        ) : null}

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
              {showAddLibrary ? "Cancel" : "Add folder library"}
            </button>
          </div>
          <p className="settings__blocks-hint">
            Local library stores blocks in this profile. Add libraries from a
            folder on your computer (with a <code>blocks/</code> subfolder of
            JSON files; the folder will be created if missing).
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
              <div className="settings__param-row settings__param-row--folder">
                <input
                  className="settings__input"
                  type="text"
                  value={addLibFolderPath}
                  onChange={(e) => setAddLibFolderPath(e.target.value)}
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
                          e instanceof Error ? e.message : "Could not open folder dialog",
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
                    setLibraryError("Name and folder path are required.");
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
