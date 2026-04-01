import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchRequestLogs, type RequestLogEntry } from "../../api/logs";
import { getRecordingStatus, startRecording, stopRecording } from "../../api/proxy";
import {
  buildFullUrl,
  getEntryProtocolType,
  getProtocolTabs,
  getResponseSize,
  getStatusText,
  type FavoriteItem,
  type ProtocolTab,
  type SidebarFilter,
  loadFavorites,
  saveFavorites,
  isPinned,
  togglePin,
} from "./feedUtils";
import FeedDetailPanels from "./FeedDetailPanels";

const REFRESH_INTERVAL_MS = 1500;
const METHOD_ORDER = ["GET", "POST", "PUT", "PATCH", "DELETE"];
const PROFILE_EMPTY_LABEL = "—";

type SortKey = "time" | "method" | "path" | "matched" | "profile";
type SortDirection = "asc" | "desc";

const formatTime = (timestampMs: number) => {
  const date = new Date(timestampMs);
  return date.toLocaleTimeString();
};

const buildQueryString = (query: Record<string, string>) => {
  const entries = Object.entries(query);
  if (entries.length === 0) return "";
  const params = new URLSearchParams();
  entries.forEach(([key, value]) => params.append(key, value));
  return `?${params.toString()}`;
};

const DEFAULT_API_BASE = "http://127.0.0.1:3000";

type DebugPanelProps = {
  selectedProfile: string;
  profileBaseUrl?: string;
  onCreateBlockFromLog: (entry: RequestLogEntry) => void;
};

function searchableText(entry: RequestLogEntry): string {
  const pathWithQuery = entry.path + buildQueryString(entry.query);
  const profile = entry.profile ?? "";
  const subProfile = entry.subProfile ?? "";
  const request = entry.request ?? entry.block ?? "";
  return [pathWithQuery, profile, subProfile, request].join(" ").toLowerCase();
}

function urlMatchesBaseUrl(entry: RequestLogEntry, baseUrl: string): boolean {
  const full = buildFullUrl(entry);
  const base = baseUrl.trim().replace(/\/+$/, "");
  if (!base) return true;
  return full === base || full.startsWith(base + "/");
}

const DebugPanel = ({
  selectedProfile,
  profileBaseUrl = "",
  onCreateBlockFromLog,
}: DebugPanelProps) => {
  const [logs, setLogs] = useState<RequestLogEntry[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [methodFilter, setMethodFilter] = useState("");
  const [matchedFilter, setMatchedFilter] = useState<"" | "matched" | "unmatched">("");
  const [profileFilter, setProfileFilter] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("time");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [sidebarFilter, setSidebarFilter] = useState<SidebarFilter>({ type: "all" });
  const [favorites, setFavoritesState] = useState<FavoriteItem[]>(() => loadFavorites());
  const [expandedApps, setExpandedApps] = useState(true);
  const [expandedDomains, setExpandedDomains] = useState(true);
  const [protocolFilter, setProtocolFilter] = useState<ProtocolTab>("All");
  const [filterByBaseUrl, setFilterByBaseUrl] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<RequestLogEntry | null>(null);
  const apiBase = import.meta.env.VITE_MAPY_BASE_URL ?? DEFAULT_API_BASE;
  const hasBaseUrl = (profileBaseUrl ?? "").trim().length > 0;

  const setFavorites = useCallback((next: FavoriteItem[] | ((prev: FavoriteItem[]) => FavoriteItem[])) => {
    setFavoritesState((prev) => {
      const nextVal = typeof next === "function" ? next(prev) : next;
      saveFavorites(nextVal);
      return nextVal;
    });
  }, []);

  // Show all requests; use the Profile filter in the toolbar to narrow by profile
  const profileScopedLogs = useMemo(() => logs, [logs]);

  const refreshLogs = async () => {
    try {
      const data = await fetchRequestLogs();
      setLogs(data);
      setErrorMessage("");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to load request logs."
      );
    }
  };

  const refreshRecordingStatus = async () => {
    try {
      const status = await getRecordingStatus();
      setIsRecording(status.recording);
    } catch {
      // ignore
    }
  };

  const toggleRecording = async () => {
    try {
      const result = isRecording
        ? await stopRecording()
        : await startRecording();
      setIsRecording(result.recording);
      setErrorMessage("");
    } catch (error) {
      await refreshRecordingStatus();
      setErrorMessage(
        error instanceof Error
          ? error.message
          : `Unable to ${isRecording ? "stop" : "start"} recording.`
      );
    }
  };

  useEffect(() => {
    refreshLogs();
    refreshRecordingStatus();
  }, []);

  useEffect(() => {
    if (isPaused) return;
    const interval = window.setInterval(refreshLogs, REFRESH_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [isPaused]);

  const methods = useMemo(() => {
    const set = new Set(profileScopedLogs.map((e) => e.method.toUpperCase()));
    return METHOD_ORDER.filter((m) => set.has(m));
  }, [profileScopedLogs]);

  const profiles = useMemo(() => {
    const set = new Set<string>();
    profileScopedLogs.forEach((e) => {
      set.add((e.profile ?? "").trim() || PROFILE_EMPTY_LABEL);
    });
    const list = Array.from(set);
    list.sort((a, b) => {
      if (a === PROFILE_EMPTY_LABEL) return 1;
      if (b === PROFILE_EMPTY_LABEL) return -1;
      return a.localeCompare(b);
    });
    return list;
  }, [profileScopedLogs]);

  const sourceApps = useMemo(() => {
    const counts = new Map<string, number>();
    profileScopedLogs.forEach((e) => {
      if (e.sourceApp) {
        counts.set(e.sourceApp, (counts.get(e.sourceApp) ?? 0) + 1);
      }
    });
    return Array.from(counts.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, count]) => ({ name, count }));
  }, [profileScopedLogs]);

  const sourceDomains = useMemo(() => {
    const counts = new Map<string, number>();
    profileScopedLogs.forEach((e) => {
      if (e.host) {
        counts.set(e.host, (counts.get(e.host) ?? 0) + 1);
      }
    });
    return Array.from(counts.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, count]) => ({ name, count }));
  }, [profileScopedLogs]);

  const filteredAndSortedRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let result = [...profileScopedLogs];

    if (sidebarFilter.type === "app") {
      result = result.filter((e) => (e.sourceApp ?? null) === sidebarFilter.value);
    } else if (sidebarFilter.type === "domain") {
      result = result.filter((e) => (e.host ?? null) === sidebarFilter.value);
    }

    if (protocolFilter !== "All") {
      result = result.filter((e) => getEntryProtocolType(e) === protocolFilter);
    }

    if (filterByBaseUrl) {
      const base = (profileBaseUrl ?? "").trim().replace(/\/+$/, "");
      if (base) {
        result = result.filter((e) => urlMatchesBaseUrl(e, base));
      }
    }

    if (q) {
      result = result.filter((entry) => searchableText(entry).includes(q));
    }
    if (methodFilter) {
      result = result.filter(
        (e) => e.method.toUpperCase() === methodFilter.toUpperCase()
      );
    }
    if (matchedFilter === "matched") {
      result = result.filter((e) => e.matched);
    } else if (matchedFilter === "unmatched") {
      result = result.filter((e) => !e.matched);
    }
    if (profileFilter) {
      const target = profileFilter === PROFILE_EMPTY_LABEL ? "" : profileFilter;
      result = result.filter(
        (e) =>
          ((e.profile ?? "").trim() || PROFILE_EMPTY_LABEL) ===
          (target || PROFILE_EMPTY_LABEL)
      );
    }

    const cmp = (a: RequestLogEntry, b: RequestLogEntry): number => {
      let diff = 0;
      switch (sortKey) {
        case "time":
          diff = a.timestampMs - b.timestampMs;
          break;
        case "method":
          diff = a.method.localeCompare(b.method);
          break;
        case "path":
          diff = (a.path + buildQueryString(a.query)).localeCompare(
            b.path + buildQueryString(b.query)
          );
          break;
        case "matched":
          diff = (a.matched ? 1 : 0) - (b.matched ? 1 : 0);
          break;
        case "profile":
          diff = (a.profile ?? "").localeCompare(b.profile ?? "");
          break;
        default:
          break;
      }
      return sortDirection === "asc" ? diff : -diff;
    };
    result.sort(cmp);
    return result;
  }, [
    profileScopedLogs,
    sidebarFilter,
    protocolFilter,
    filterByBaseUrl,
    profileBaseUrl,
    searchQuery,
    methodFilter,
    matchedFilter,
    profileFilter,
    sortKey,
    sortDirection,
  ]);

  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    methodFilter !== "" ||
    matchedFilter !== "" ||
    profileFilter !== "" ||
    sidebarFilter.type !== "all" ||
    protocolFilter !== "All" ||
    filterByBaseUrl;
  const isEmpty = profileScopedLogs.length === 0;
  const hasNoResults = !isEmpty && filteredAndSortedRows.length === 0;

  const clearFilters = () => {
    setSearchQuery("");
    setMethodFilter("");
    setMatchedFilter("");
    setProfileFilter("");
    setSidebarFilter({ type: "all" });
    setProtocolFilter("All");
    setFilterByBaseUrl(false);
    setSortKey("time");
    setSortDirection("desc");
  };

  const handlePin = (e: React.MouseEvent, type: "app" | "domain", value: string) => {
    e.stopPropagation();
    setFavorites((prev) => togglePin(prev, type, value));
  };

  const isSelected = (entry: RequestLogEntry) =>
    selectedEntry != null &&
    selectedEntry.timestampMs === entry.timestampMs &&
    selectedEntry.path === entry.path &&
    selectedEntry.method === entry.method;

  return (
    <section className="panel debug">
      <header className="panel__header">
        <div>
          <h2>Request Feed</h2>
          <p className="panel__hint">Live request stream from the proxy server.</p>
          <p className="panel__hint">
            API base <code>{apiBase}</code>
          </p>
        </div>
        <div className="debug__actions">
          <button
            className={`panel__action${isRecording ? " debug__record-btn--recording" : ""}`}
            type="button"
            onClick={toggleRecording}
          >
            {isRecording ? "Stop Recording" : "Start Recording"}
          </button>
          <button
            className="panel__action panel__action--ghost"
            type="button"
            onClick={() => setIsPaused((prev) => !prev)}
          >
            {isPaused ? "Resume" : "Pause"}
          </button>
          <button className="panel__action" type="button" onClick={refreshLogs}>
            Refresh
          </button>
        </div>
      </header>

      <div className="debug__layout debug__layout--with-sidebar">
        <aside className="debug__sidebar">
          <div className="debug__sidebar-section">
            <div className="debug__sidebar-section-title">Pin</div>
            {favorites.length === 0 ? (
              <div className="debug__sidebar-placeholder">No pinned items</div>
            ) : (
              favorites.map((fav) => (
                <button
                  key={`${fav.type}-${fav.value}`}
                  type="button"
                  className={`debug__sidebar-item${
                    sidebarFilter.type === fav.type && sidebarFilter.value === fav.value
                      ? " debug__sidebar-item--active"
                      : ""
                  }`}
                  onClick={() =>
                    setSidebarFilter(
                      fav.type === "app" ? { type: "app", value: fav.value } : { type: "domain", value: fav.value }
                    )
                  }
                >
                  <span className="debug__sidebar-label">{fav.value}</span>
                  <span
                    className="debug__sidebar-unpin"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFavorites((prev) => togglePin(prev, fav.type, fav.value));
                      if (
                        sidebarFilter.type === fav.type &&
                        sidebarFilter.value === fav.value
                      ) {
                        setSidebarFilter({ type: "all" });
                      }
                    }}
                    title="Unpin"
                    aria-label="Unpin"
                  >
                    ×
                  </span>
                </button>
              ))
            )}
          </div>
          <div className="debug__sidebar-section">
            <button
              type="button"
              className={`debug__sidebar-item${
                sidebarFilter.type === "all" ? " debug__sidebar-item--active" : ""
              }`}
              onClick={() => setSidebarFilter({ type: "all" })}
            >
              <span className="debug__sidebar-label">All</span>
              <span className="debug__sidebar-count">{profileScopedLogs.length}</span>
            </button>
            <div className="debug__sidebar-group">
              <button
                type="button"
                className="debug__sidebar-group-header"
                onClick={() => setExpandedApps((x) => !x)}
                aria-expanded={expandedApps}
              >
                <span className="debug__sidebar-group-chevron">
                  {expandedApps ? "▼" : "▶"}
                </span>
                <span>Apps</span>
                <span className="debug__sidebar-count">{sourceApps.length}</span>
              </button>
              {expandedApps &&
                sourceApps.map(({ name, count }) => (
                  <button
                    key={name}
                    type="button"
                    className={`debug__sidebar-item debug__sidebar-item--indent${
                      sidebarFilter.type === "app" && sidebarFilter.value === name
                        ? " debug__sidebar-item--active"
                        : ""
                    }`}
                    onClick={() => setSidebarFilter({ type: "app", value: name })}
                  >
                    <span className="debug__sidebar-label">{name}</span>
                    <span className="debug__sidebar-count">{count}</span>
                    <span
                      className={`debug__sidebar-pin${isPinned(favorites, "app", name) ? " is-pinned" : ""}`}
                      onClick={(e) => handlePin(e, "app", name)}
                      title={isPinned(favorites, "app", name) ? "Unpin" : "Pin"}
                      aria-label={isPinned(favorites, "app", name) ? "Unpin" : "Pin"}
                    >
                      📌
                    </span>
                  </button>
                ))}
            </div>
            <div className="debug__sidebar-group">
              <button
                type="button"
                className="debug__sidebar-group-header"
                onClick={() => setExpandedDomains((x) => !x)}
                aria-expanded={expandedDomains}
              >
                <span className="debug__sidebar-group-chevron">
                  {expandedDomains ? "▼" : "▶"}
                </span>
                <span>Domains</span>
                <span className="debug__sidebar-count">{sourceDomains.length}</span>
              </button>
              {expandedDomains &&
                sourceDomains.map(({ name, count }) => (
                  <button
                    key={name}
                    type="button"
                    className={`debug__sidebar-item debug__sidebar-item--indent${
                      sidebarFilter.type === "domain" && sidebarFilter.value === name
                        ? " debug__sidebar-item--active"
                        : ""
                    }`}
                    onClick={() => setSidebarFilter({ type: "domain", value: name })}
                  >
                    <span className="debug__sidebar-label">{name}</span>
                    <span className="debug__sidebar-count">{count}</span>
                    <span
                      className={`debug__sidebar-pin${isPinned(favorites, "domain", name) ? " is-pinned" : ""}`}
                      onClick={(e) => handlePin(e, "domain", name)}
                      title={isPinned(favorites, "domain", name) ? "Unpin" : "Pin"}
                      aria-label={isPinned(favorites, "domain", name) ? "Unpin" : "Pin"}
                    >
                      📌
                    </span>
                  </button>
                ))}
            </div>
          </div>
        </aside>

        <div className="debug__main">
          {!isEmpty && errorMessage ? (
            <p className="panel__message panel__message--error">{errorMessage}</p>
          ) : null}

          {!isEmpty && (
            <div className="debug__filters">
              <input
                type="search"
                className="debug__search"
                placeholder="Search path, profile, request…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search requests"
              />
              <select
                className="debug__select"
                value={methodFilter}
                onChange={(e) => setMethodFilter(e.target.value)}
                aria-label="Filter by method"
              >
                <option value="">All methods</option>
                {methods.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              <select
                className="debug__select"
                value={matchedFilter}
                onChange={(e) =>
                  setMatchedFilter((e.target.value || "") as "" | "matched" | "unmatched")
                }
                aria-label="Filter by matched"
              >
                <option value="">All</option>
                <option value="matched">Matched</option>
                <option value="unmatched">Unmatched</option>
              </select>
              <select
                className="debug__select"
                value={profileFilter}
                onChange={(e) => setProfileFilter(e.target.value)}
                aria-label="Filter by profile"
              >
                <option value="">All profiles</option>
                {profiles.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              <select
                className="debug__select"
                value={`${sortKey}-${sortDirection}`}
                onChange={(e) => {
                  const [key, dir] = e.target.value.split("-") as [SortKey, SortDirection];
                  setSortKey(key);
                  setSortDirection(dir);
                }}
                aria-label="Sort by"
              >
                <option value="time-desc">Newest first</option>
                <option value="time-asc">Oldest first</option>
                <option value="method-asc">Method A–Z</option>
                <option value="method-desc">Method Z–A</option>
                <option value="path-asc">Path A–Z</option>
                <option value="path-desc">Path Z–A</option>
                <option value="matched-desc">Matched first</option>
                <option value="matched-asc">Unmatched first</option>
                <option value="profile-asc">Profile A–Z</option>
                <option value="profile-desc">Profile Z–A</option>
              </select>
              <button
                type="button"
                className={`panel__action panel__action--ghost${filterByBaseUrl ? " debug__filter-btn--active" : ""}`}
                onClick={() => setFilterByBaseUrl((prev) => !prev)}
                disabled={!hasBaseUrl}
                title={
                  hasBaseUrl
                    ? filterByBaseUrl
                      ? "Show all requests (clear base URL filter)"
                      : "Show only requests matching the profile base URL"
                    : "Set the profile base URL in Settings to use this filter"
                }
                aria-label="Filter by profile base URL"
                aria-pressed={filterByBaseUrl}
              >
                Base URL only
              </button>
            </div>
          )}

          {!isEmpty && (
            <p className="debug__summary">
              {hasActiveFilters
                ? `Showing ${filteredAndSortedRows.length} of ${profileScopedLogs.length} requests`
                : `${profileScopedLogs.length} request${profileScopedLogs.length === 1 ? "" : "s"}`}
            </p>
          )}

          <div className="debug__protocol-tabs">
            {getProtocolTabs().map((tab) => (
              <button
                key={tab}
                type="button"
                className={`debug__protocol-tab${protocolFilter === tab ? " debug__protocol-tab--active" : ""}`}
                onClick={() => setProtocolFilter(tab)}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="debug__table-wrap">
            <table className="debug__table">
              <thead>
                <tr>
                  <th scope="col" className="debug__cell debug__cell--dot" aria-hidden="true" />
                  <th scope="col" className="debug__cell debug__cell--id">ID</th>
                  <th scope="col" className="debug__cell debug__cell--url">URL</th>
                  <th scope="col" className="debug__cell debug__cell--client">Client</th>
                  <th scope="col" className="debug__cell debug__cell--method">Method</th>
                  <th scope="col" className="debug__cell debug__cell--status">Status</th>
                  <th scope="col" className="debug__cell debug__cell--code">Code</th>
                  <th scope="col" className="debug__cell debug__cell--time">Time</th>
                  <th scope="col" className="debug__cell debug__cell--duration">Duration</th>
                  <th scope="col" className="debug__cell debug__cell--req-size">Req size</th>
                  <th scope="col" className="debug__cell debug__cell--res-size">Res size</th>
                  <th scope="col" className="debug__cell debug__cell--ssl">SSL</th>
                  <th scope="col" className="debug__cell debug__cell--actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isEmpty ? (
                  <tr>
                    <td colSpan={13} className="debug__empty">
                      {errorMessage
                        ? errorMessage
                        : "No requests captured yet."}
                    </td>
                  </tr>
                ) : hasNoResults ? (
                  <tr>
                    <td colSpan={13} className="debug__empty debug__empty--filtered">
                      <p>No requests match the current filters.</p>
                      <button
                        className="panel__action panel__action--ghost"
                        type="button"
                        onClick={clearFilters}
                      >
                        Clear filters
                      </button>
                    </td>
                  </tr>
                ) : (
                  filteredAndSortedRows.map((entry, index) => {
                    const status = entry.response?.status ?? null;
                    const statusOk = status != null && status >= 200 && status < 300;
                    const resSize = getResponseSize(entry);
                    const fullUrl = buildFullUrl(entry);
                    const ssl = entry.host ? "✓" : "—";
                    return (
                      <tr
                        key={`${entry.timestampMs}-${index}`}
                        className={isSelected(entry) ? "debug__row--selected" : ""}
                        onClick={() => setSelectedEntry(entry)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setSelectedEntry(entry);
                          }
                        }}
                      >
                        <td
                          className={`debug__cell debug__cell--status-dot${
                            statusOk ? " debug__cell--status-dot-ok" : ""
                          }`}
                          title={statusOk ? "Completed" : "Other"}
                        />
                        <td className="debug__cell debug__cell--id">
                          {String(entry.timestampMs).slice(-6)}
                        </td>
                        <td
                          className="debug__cell debug__cell--url debug__cell--path"
                          title={fullUrl}
                        >
                          {fullUrl}
                        </td>
                        <td className="debug__cell debug__cell--client">
                          <span className="debug__client-avatar">
                            {(entry.sourceApp ?? "?")[0].toUpperCase()}
                          </span>
                          {entry.sourceApp ?? "—"}
                        </td>
                        <td className="debug__cell debug__cell--method">
                          <span
                            className={`debug__badge debug__badge--${entry.method.toLowerCase()}`}
                          >
                            {entry.method}
                          </span>
                        </td>
                        <td className="debug__cell debug__cell--status">
                          {getStatusText(status)}
                        </td>
                        <td className="debug__cell debug__cell--code">
                          {status ?? "—"}
                        </td>
                        <td className="debug__cell debug__cell--time debug__cell--muted">
                          {formatTime(entry.timestampMs)}
                        </td>
                        <td className="debug__cell debug__cell--duration">—</td>
                        <td className="debug__cell debug__cell--req-size">—</td>
                        <td className="debug__cell debug__cell--res-size">
                          {resSize != null ? resSize : "—"}
                        </td>
                        <td className="debug__cell debug__cell--ssl">{ssl}</td>
                        <td className="debug__cell debug__cell--actions">
                          <button
                            className="panel__action panel__action--ghost debug__action"
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onCreateBlockFromLog(entry);
                            }}
                          >
                            Create Block
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {selectedEntry && (
            <FeedDetailPanels entry={selectedEntry} />
          )}
        </div>
      </div>
    </section>
  );
};

export default DebugPanel;
