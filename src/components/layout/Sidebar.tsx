import type { Profile } from "../../types/profile";

type SidebarProps = {
  profiles: Profile[];
  selectedProfile: string;
  activeProfileError?: string;
  activeView: "builder" | "debug";
  onSelectProfile: (profileId: string) => void;
  onChangeView: (view: "builder" | "debug") => void;
  onManageProfiles: () => void;
  onManageSubprofiles: () => void;
};

const Sidebar = ({
  profiles,
  selectedProfile,
  activeProfileError,
  activeView,
  onSelectProfile,
  onChangeView,
  onManageProfiles,
  onManageSubprofiles,
}: SidebarProps) => {
  const selectedProfileData =
    profiles.find((profile) => profile.name === selectedProfile) ?? null;
  const hasProfiles = profiles.length > 0;

  return (
    <aside className="sidebar">
      <div className="sidebar__header">
        <div className="sidebar__label-row">
          <label className="sidebar__label" htmlFor="profile-select">
            Profile
          </label>
          <button
            className="sidebar__icon-button"
            type="button"
            onClick={onManageProfiles}
            aria-label="Manage profiles"
          >
            ⚙
          </button>
        </div>
        <select
          id="profile-select"
          className="sidebar__select"
          value={selectedProfile}
          onChange={(event) => onSelectProfile(event.target.value)}
          disabled={!hasProfiles}
        >
          {profiles.map((profile) => (
            <option key={profile.name} value={profile.name}>
              {profile.name}
            </option>
          ))}
        </select>
        {activeProfileError ? (
          <div className="settings__empty">{activeProfileError}</div>
        ) : null}
      </div>
      <div className="sidebar__section">
        <div className="sidebar__section-header">
          <h2 className="sidebar__title">Subprofiles</h2>
          <button
            className="sidebar__icon-button"
            type="button"
            onClick={onManageSubprofiles}
            aria-label="Manage subprofiles"
          >
            ⚙
          </button>
        </div>
        <ul className="sidebar__list">
          {(selectedProfileData?.subProfiles ?? []).map((subprofile) => (
            <li key={subprofile.name} className="sidebar__item">
              {subprofile.name}
            </li>
          ))}
          {!selectedProfileData ||
          (selectedProfileData.subProfiles?.length ?? 0) === 0 ? (
            <li className="sidebar__item">No subprofiles yet.</li>
          ) : null}
        </ul>
      </div>
      <div className="sidebar__section">
        <div className="sidebar__section-header">
          <h2 className="sidebar__title">Views</h2>
        </div>
        <div className="sidebar__nav">
          <button
            className={`sidebar__nav-button ${activeView === "builder" ? "is-active" : ""}`}
            type="button"
            onClick={() => onChangeView("builder")}
          >
            Builder
          </button>
          <button
            className={`sidebar__nav-button ${activeView === "debug" ? "is-active" : ""}`}
            type="button"
            onClick={() => onChangeView("debug")}
          >
            Debug
          </button>
        </div>
      </div>
      <div className="sidebar__footer">
        <button className="sidebar__nav-button" type="button" onClick={onManageSubprofiles}>
          Manage Subprofiles
        </button>
        <button className="sidebar__nav-button" type="button" onClick={onManageProfiles}>
          Manage Profiles
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
