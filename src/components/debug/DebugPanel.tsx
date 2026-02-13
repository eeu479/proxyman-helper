import { useEffect, useMemo, useState } from "react";
import { fetchRequestLogs, type RequestLogEntry } from "../../api/logs";

const REFRESH_INTERVAL_MS = 1500;

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

const DebugPanel = () => {
  const [logs, setLogs] = useState<RequestLogEntry[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const apiBase = import.meta.env.VITE_LOCAL_PROXY_BASE_URL ?? DEFAULT_API_BASE;

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

  const rows = useMemo(() => {
    return [...logs].reverse();
  }, [logs]);

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
      <div className="debug__table">
        <div className="debug__row debug__row--header">
          <span className="debug__cell">Time</span>
          <span className="debug__cell">Method</span>
          <span className="debug__cell">Path</span>
          <span className="debug__cell">Matched</span>
          <span className="debug__cell">Profile</span>
          <span className="debug__cell">Request</span>
        </div>
        {rows.length === 0 ? (
          <div className="debug__empty">
            {errorMessage ? errorMessage : "No requests captured yet."}
          </div>
        ) : (
          rows.map((entry, index) => (
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
            </div>
          ))
        )}
      </div>
    </section>
  );
};

export default DebugPanel;
