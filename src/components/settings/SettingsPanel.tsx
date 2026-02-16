import type { FormEvent } from "react";
import { useRef } from "react";
import type { Profile } from "../../types/profile";

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
  onDeleteProfile,
  deleteProfileError,
  isDeletingProfile,
}: SettingsPanelProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
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
