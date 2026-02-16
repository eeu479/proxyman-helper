import type { FormEvent } from "react";
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
}: SettingsPanelProps) => {
  const selectedProfileData =
    profiles.find((p) => p.name === selectedProfile) ?? null;
  const subprofiles = selectedProfileData?.subProfiles ?? [];

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
                  <button
                    className="settings__button settings__button--edit"
                    type="button"
                    onClick={() => onEditSubprofile(selectedProfile, sub.name)}
                  >
                    Edit
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {updateProfileError ? (
          <div className="settings__error">{updateProfileError}</div>
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
      </form>
    </section>
  );
};

export default SettingsPanel;
