import type { Profile } from "../../types/profile";

type SidebarProps = {
  profiles: Profile[];
  selectedProfile: string;
  selectedSubprofile: string;
  activeProfileError?: string;
  activeView: "builder" | "debug" | "settings";
  theme: "dark" | "light";
  onSelectProfile: (profileId: string) => void;
  onSelectSubprofile: (subprofileId: string) => void;
  onChangeView: (view: "builder" | "debug" | "settings") => void;
  onCreateProfile: () => void;
  onToggleTheme: () => void;
};

const Sidebar = ({
  profiles,
  selectedProfile,
  selectedSubprofile,
  activeProfileError,
  activeView,
  theme,
  onSelectProfile,
  onSelectSubprofile,
  onChangeView,
  onCreateProfile,
  onToggleTheme,
}: SidebarProps) => {
  const selectedProfileData =
    profiles.find((profile) => profile.name === selectedProfile) ?? null;
  const subprofiles = selectedProfileData?.subProfiles ?? [];
  const hasProfiles = profiles.length > 0;

  return (
    <aside className="sidebar">
      <div className="sidebar__header">
        <div className="sidebar__label-row">
          <label className="sidebar__label" htmlFor="profile-select">
            Profile
          </label>
        </div>
        <div className="sidebar__select-row">
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
          <button
            className="sidebar__add-button"
            type="button"
            onClick={onCreateProfile}
            aria-label="Create profile"
            title="Create profile"
          >
            +
          </button>
        </div>
        {activeProfileError ? (
          <div className="settings__empty">{activeProfileError}</div>
        ) : null}
      </div>
      <div className="sidebar__section">
        <div className="sidebar__label-row">
          <label className="sidebar__label" htmlFor="subprofile-select">
            Subprofile
          </label>
        </div>
        <select
          id="subprofile-select"
          className="sidebar__select"
          value={selectedSubprofile}
          onChange={(event) => onSelectSubprofile(event.target.value)}
          disabled={subprofiles.length === 0}
        >
          {subprofiles.length === 0 ? (
            <option value="">No subprofiles</option>
          ) : (
            subprofiles.map((sub) => (
              <option key={sub.name} value={sub.name}>
                {sub.name}
              </option>
            ))
          )}
        </select>
      </div>
      <div className="sidebar_spacer" />
      <div className="sidebar__section">
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
          <button
            className={`sidebar__nav-button ${activeView === "settings" ? "is-active" : ""}`}
            type="button"
            onClick={() => onChangeView("settings")}
          >
            Settings
          </button>
        </div>
      </div>
      <div className="sidebar__footer">
        <button
          className="sidebar__theme-toggle"
          type="button"
          onClick={onToggleTheme}
          aria-label={
            theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
          }
          title={
            theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
          }
        >
          {theme === "dark" ? "☀️" : "🌙"}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
