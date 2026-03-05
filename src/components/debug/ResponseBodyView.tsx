import { useMemo, useState } from "react";
import KeyValueTable from "./KeyValueTable";

type ResponseBodyViewProps = {
  headers: Record<string, string> | undefined | null;
  body: string | undefined | null;
};

type BodyFormat = "XML" | "JSON" | "Plain";

function getDefaultFormat(headers: Record<string, string> | undefined | null): BodyFormat {
  if (!headers) return "Plain";
  const key = Object.keys(headers).find((k) => k.toLowerCase() === "content-type");
  const ct = key ? String(headers[key]).toLowerCase() : "";
  if (ct.includes("json")) return "JSON";
  if (ct.includes("xml")) return "XML";
  return "Plain";
}

function formatBody(raw: string, format: BodyFormat): string {
  if (format === "Plain" || !raw.trim()) return raw;
  try {
    if (format === "JSON") {
      const parsed = JSON.parse(raw);
      return JSON.stringify(parsed, null, 2);
    }
  } catch {
    // fallback to raw
  }
  return raw;
}

export default function ResponseBodyView({ headers, body }: ResponseBodyViewProps) {
  const [activeTab, setActiveTab] = useState<"Header" | "Body" | "Raw">("Header");
  const defaultFormat = useMemo(() => getDefaultFormat(headers), [headers]);
  const [format, setFormat] = useState<BodyFormat>(defaultFormat);

  const displayBody = body ?? "";
  const formattedBody = formatBody(displayBody, format);
  const lines = formattedBody.split("\n");

  return (
    <div className="feed-detail__response-pane">
      <div className="feed-detail__tabs feed-detail__tabs--with-format">
        {(["Header", "Body", "Raw"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            className={`feed-detail__tab${activeTab === tab ? " feed-detail__tab--active" : ""}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
        <button type="button" className="feed-detail__tab feed-detail__tab--add" title="Add view">
          +
        </button>
        <span className="feed-detail__tabs-spacer" />
        {activeTab === "Body" && (
          <select
            className="feed-detail__format-select"
            value={format}
            onChange={(e) => setFormat(e.target.value as BodyFormat)}
            aria-label="Response format"
          >
            <option value="XML">XML</option>
            <option value="JSON">JSON</option>
            <option value="Plain">Plain</option>
          </select>
        )}
      </div>
      <div className="feed-detail__tab-content">
        {activeTab === "Header" && (
          <KeyValueTable headers={headers ?? {}} emptyMessage="No response headers" />
        )}
        {activeTab === "Body" && (
          <div className="feed-detail__body-wrap">
            <div className="feed-detail__line-numbers">
              {lines.map((_, i) => (
                <span key={i} className="feed-detail__line-num">
                  {i + 1}
                </span>
              ))}
            </div>
            <pre className="feed-detail__body-content">
              {formattedBody || " "}
            </pre>
          </div>
        )}
        {activeTab === "Raw" && (
          <div className="feed-detail__body-wrap">
            <pre className="feed-detail__body-content feed-detail__body-content--raw">
              {displayBody || " "}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
