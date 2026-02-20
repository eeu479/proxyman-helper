import { useEffect, useMemo, useState } from "react";
import { fetchRequestLogs, type RequestLogEntry } from "../../api/logs";

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
  if (entries.length === 0) {
    return "";
  }
  const params = new URLSearchParams();
  entries.forEach(([key, value]) => params.append(key, value));
  return `?${params.toString()}`;
};

const DEFAULT_API_BASE = "http://127.0.0.1:3000";

type DebugPanelProps = {
  selectedProfile: string;
  onCreateBlockFromLog: (entry: RequestLogEntry) => void;
};

function searchableText(entry: RequestLogEntry): string {
  const pathWithQuery = entry.path + buildQueryString(entry.query);
  const profile = entry.profile ?? "";
  const subProfile = entry.subProfile ?? "";
  const request = entry.request ?? entry.block ?? "";
  return [pathWithQuery, profile, subProfile, request]
    .join(" ")
    .toLowerCase();
}

const DebugPanel = ({ selectedProfile, onCreateBlockFromLog }: DebugPanelProps) => {
  const [logs, setLogs] = useState<RequestLogEntry[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [methodFilter, setMethodFilter] = useState("");
  const [matchedFilter, setMatchedFilter] = useState<"" | "matched" | "unmatched">("");
  const [profileFilter, setProfileFilter] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("time");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const apiBase = import.meta.env.VITE_LOCAL_PROXY_BASE_URL ?? DEFAULT_API_BASE;

  const profileScopedLogs = useMemo(() => {
    if (!selectedProfile.trim()) return logs;
    return logs.filter((e) => (e.profile ?? "").trim() === selectedProfile.trim());
  }, [logs, selectedProfile]);

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

  useEffect(() => {
    refreshLogs();
  }, []);

  useEffect(() => {
    if (isPaused) {
      return;
    }
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

  const filteredAndSortedRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let result = [...profileScopedLogs];

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
        (e) => ((e.profile ?? "").trim() || PROFILE_EMPTY_LABEL) === (target || PROFILE_EMPTY_LABEL)
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
  }, [profileScopedLogs, searchQuery, methodFilter, matchedFilter, profileFilter, sortKey, sortDirection]);

  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    methodFilter !== "" ||
    matchedFilter !== "" ||
    profileFilter !== "";
  const isEmpty = profileScopedLogs.length === 0;
  const hasNoResults = !isEmpty && filteredAndSortedRows.length === 0;

  const clearFilters = () => {
    setSearchQuery("");
    setMethodFilter("");
    setMatchedFilter("");
    setProfileFilter("");
    setSortKey("time");
    setSortDirection("desc");
  };

  return (
    <section className="panel debug">
      <header className="panel__header">
        <div>
          <h2>Debug</h2>
          <p className="panel__hint">Live request stream from the proxy server.</p>
          <p className="panel__hint">
            API base
            <code>{apiBase}</code>
          </p>
        </div>
        <div className="debug__actions">
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

      {!isEmpty ? (
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
        </div>
      ) : null}

      {!isEmpty ? (
        <p className="debug__summary">
          {hasActiveFilters
            ? `Showing ${filteredAndSortedRows.length} of ${profileScopedLogs.length} requests`
            : `${profileScopedLogs.length} request${profileScopedLogs.length === 1 ? "" : "s"}`}
        </p>
      ) : null}

      <div className="debug__table">
        <div className="debug__row debug__row--header">
          <span className="debug__cell">Time</span>
          <span className="debug__cell">Method</span>
          <span className="debug__cell">Path</span>
          <span className="debug__cell">Matched</span>
          <span className="debug__cell">Profile</span>
          <span className="debug__cell">Request</span>
          <span className="debug__cell">Actions</span>
        </div>
        {isEmpty ? (
          <div className="debug__empty">
            {errorMessage
              ? errorMessage
              : selectedProfile.trim()
                ? `No requests for profile "${selectedProfile}" yet.`
                : "No requests captured yet."}
          </div>
        ) : hasNoResults ? (
          <div className="debug__empty debug__empty--filtered">
            <p>No requests match the current filters.</p>
            <button
              className="panel__action panel__action--ghost"
              type="button"
              onClick={clearFilters}
            >
              Clear filters
            </button>
          </div>
        ) : (
          filteredAndSortedRows.map((entry, index) => (
            <div key={`${entry.timestampMs}-${index}`} className="debug__row">
              <span className="debug__cell debug__cell--muted">
                {formatTime(entry.timestampMs)}
              </span>
              <span className="debug__cell">
                <span className={`debug__badge debug__badge--${entry.method.toLowerCase()}`}>
                  {entry.method}
                </span>
              </span>
              <span className="debug__cell debug__cell--path">
                {entry.path}
                {buildQueryString(entry.query)}
              </span>
              <span className="debug__cell">
                {entry.matched ? "Yes" : "No"}
              </span>
              <span className="debug__cell">
                {entry.profile ?? "—"}
              </span>
              <span className="debug__cell">
                {entry.request ?? entry.block ?? "—"}
              </span>
              <span className="debug__cell">
                <button
                  className="panel__action panel__action--ghost debug__action"
                  type="button"
                  onClick={() => onCreateBlockFromLog(entry)}
                >
                  Create Block
                </button>
              </span>
            </div>
          ))
        )}
      </div>
    </section>
  );
};

export default DebugPanel;
