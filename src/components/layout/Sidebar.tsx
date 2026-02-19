import type { Profile } from "../../types/profile";

type SidebarProps = {
  profiles: Profile[];
  selectedProfile: string;
  selectedSubprofile: string;
  activeProfileError?: string;
  activeView: "builder" | "debug" | "settings" | "library";
  theme: "dark" | "light";
  minimized: boolean;
  onToggleMinimize: () => void;
  onSelectProfile: (profileId: string) => void;
  onSelectSubprofile: (subprofileId: string) => void;
  onChangeView: (view: "builder" | "debug" | "settings" | "library") => void;
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
  minimized,
  onToggleMinimize,
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
    <aside className={`sidebar ${minimized ? "sidebar--minimized" : ""}`}>
      <div className="sidebar__header">
        <button
          className="sidebar__collapse-button"
          type="button"
          onClick={onToggleMinimize}
          aria-label={minimized ? "Expand sidebar" : "Minimize sidebar"}
          title={minimized ? "Expand sidebar" : "Minimize sidebar"}
        >
          {minimized ? (
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <line x1="4" x2="20" y1="12" y2="12" />
              <line x1="4" x2="20" y1="6" y2="6" />
              <line x1="4" x2="20" y1="18" y2="18" />
            </svg>
          ) : (
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
          )}
        </button>
        {!minimized && (
          <>
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
          </>
        )}
      </div>
      {!minimized && (
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
      )}
      <div className="sidebar_spacer" />
      <div className="sidebar__section">
        <div className="sidebar__nav">
          <button
            className={`sidebar__nav-button ${activeView === "builder" ? "is-active" : ""}`}
            type="button"
            onClick={() => onChangeView("builder")}
            title="Builder"
            aria-label="Builder"
          >
            {minimized ? (
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
              </svg>
            ) : (
              "Builder"
            )}
          </button>
          <button
            className={`sidebar__nav-button ${activeView === "library" ? "is-active" : ""}`}
            type="button"
            onClick={() => onChangeView("library")}
            title="Library"
            aria-label="Library"
          >
            {minimized ? (
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
              </svg>
            ) : (
              "Library"
            )}
          </button>
          <button
            className={`sidebar__nav-button ${activeView === "debug" ? "is-active" : ""}`}
            type="button"
            onClick={() => onChangeView("debug")}
            title="Debug"
            aria-label="Debug"
          >
            {minimized ? (
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="m8 2 1 1" />
                <path d="m16 2-1 1" />
                <path d="M12 3v2" />
                <path d="M18 8a6 6 0 0 0-12 0" />
                <path d="M4.93 18.68 6.34 17.26" />
                <path d="M19.07 18.68 17.66 17.26" />
                <path d="M6 22l2-4 2 4" />
                <path d="M16 22l-2-4 2 4" />
                <path d="M10 22h4" />
              </svg>
            ) : (
              "Debug"
            )}
          </button>
          <button
            className={`sidebar__nav-button ${activeView === "settings" ? "is-active" : ""}`}
            type="button"
            onClick={() => onChangeView("settings")}
            title="Settings"
            aria-label="Settings"
          >
            {minimized ? (
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            ) : (
              "Settings"
            )}
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
