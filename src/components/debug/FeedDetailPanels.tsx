import { useState } from "react";
import type { RequestLogEntry } from "../../api/logs";
import { buildFullUrl, getStatusText } from "./feedUtils";
import KeyValueTable from "./KeyValueTable";
import ResponseBodyView from "./ResponseBodyView";

type FeedDetailPanelsProps = {
  entry: RequestLogEntry;
};

export default function FeedDetailPanels({ entry }: FeedDetailPanelsProps) {
  const [requestTab, setRequestTab] = useState<"Header" | "Body" | "Raw">("Header");

  const fullUrl = buildFullUrl(entry);
  const status = entry.response?.status ?? null;
  const statusText = getStatusText(status);

  return (
    <div className="feed-detail">
      <div className="feed-detail__url-bar">
        <span className={`feed-detail__badge feed-detail__badge--method feed-detail__badge--${entry.method.toLowerCase()}`}>
          {entry.method}
        </span>
        <span className="feed-detail__badge feed-detail__badge--status">
          {statusText}
        </span>
        <span className="feed-detail__url" title={fullUrl}>
          {fullUrl}
        </span>
      </div>
      <div className="feed-detail__panes">
        <div className="feed-detail__pane feed-detail__pane--request">
          <div className="feed-detail__pane-title">Request</div>
          <div className="feed-detail__tabs">
            {(["Header", "Body", "Raw"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                className={`feed-detail__tab${requestTab === tab ? " feed-detail__tab--active" : ""}`}
                onClick={() => setRequestTab(tab)}
              >
                {tab}
              </button>
            ))}
            <button type="button" className="feed-detail__tab feed-detail__tab--add" title="Add view">
              +
            </button>
          </div>
          <div className="feed-detail__tab-content">
            {requestTab === "Header" && (
              <KeyValueTable
                headers={{}}
                emptyMessage="Request headers not captured"
              />
            )}
            {requestTab === "Body" && (
              <div className="feed-detail__empty">
                Request body not captured
              </div>
            )}
            {requestTab === "Raw" && (
              <div className="feed-detail__empty">
                Request raw not captured
              </div>
            )}
          </div>
        </div>
        <div className="feed-detail__divider" />
        <div className="feed-detail__pane feed-detail__pane--response">
          <div className="feed-detail__pane-title">Response</div>
          <ResponseBodyView
            headers={entry.response?.headers}
            body={entry.response?.body}
          />
        </div>
      </div>
    </div>
  );
}
