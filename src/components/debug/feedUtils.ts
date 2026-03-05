import type { RequestLogEntry } from "../../api/logs";

const FAVORITES_KEY = "mapy-feed-favorites";

export type FavoriteItem = { type: "app"; value: string } | { type: "domain"; value: string };

export function loadFavorites(): FavoriteItem[] {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (x): x is FavoriteItem =>
        x && typeof x === "object" && (x.type === "app" || x.type === "domain") && typeof x.value === "string"
    );
  } catch {
    return [];
  }
}

export function saveFavorites(items: FavoriteItem[]): void {
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(items));
  } catch {
    // ignore
  }
}

export function isPinned(favorites: FavoriteItem[], type: "app" | "domain", value: string): boolean {
  return favorites.some((f) => f.type === type && f.value === value);
}

export function togglePin(
  favorites: FavoriteItem[],
  type: "app" | "domain",
  value: string
): FavoriteItem[] {
  const key = `${type}:${value}`;
  const exists = favorites.some((f) => `${f.type}:${f.value}` === key);
  if (exists) return favorites.filter((f) => `${f.type}:${f.value}` !== key);
  return [...favorites, { type, value }];
}

export type SidebarFilter =
  | { type: "all" }
  | { type: "app"; value: string }
  | { type: "domain"; value: string };

export function buildFullUrl(entry: RequestLogEntry): string {
  const q = buildQueryString(entry.query);
  if (entry.host) {
    const scheme = "https";
    return `${scheme}://${entry.host}${entry.path}${q}`;
  }
  return `${entry.path}${q}`;
}

export function buildQueryString(query: Record<string, string>): string {
  const entries = Object.entries(query);
  if (entries.length === 0) return "";
  const params = new URLSearchParams();
  entries.forEach(([key, value]) => params.append(key, value));
  return `?${params.toString()}`;
}

const PROTOCOL_TABS = [
  "All",
  "HTTP",
  "HTTPS",
  "WebSocket",
  "JSON",
  "Form",
  "XML",
  "JS",
  "CSS",
  "GraphQL",
  "Document",
  "Media",
  "Other",
] as const;

export type ProtocolTab = (typeof PROTOCOL_TABS)[number];

export function getProtocolTabs(): ProtocolTab[] {
  return [...PROTOCOL_TABS];
}

function getContentType(entry: RequestLogEntry): string {
  const headers = entry.response?.headers;
  if (!headers) return "";
  const key = Object.keys(headers).find((k) => k.toLowerCase() === "content-type");
  return key ? String(headers[key]).toLowerCase() : "";
}

function inferProtocolType(entry: RequestLogEntry): string {
  const path = (entry.path ?? "").toLowerCase();
  const contentType = getContentType(entry);

  if (contentType.includes("graphql") || path.includes("graphql")) return "GraphQL";
  if (contentType.includes("json") || path.endsWith(".json")) return "JSON";
  if (contentType.includes("form") || contentType.includes("x-www-form-urlencoded")) return "Form";
  if (contentType.includes("xml") || path.endsWith(".xml")) return "XML";
  if (path.endsWith(".js") || contentType.includes("javascript")) return "JS";
  if (path.endsWith(".css") || contentType.includes("css")) return "CSS";
  if (
    contentType.includes("html") ||
    contentType.includes("document") ||
    path.endsWith(".html") ||
    path.endsWith("/")
  )
    return "Document";
  if (
    contentType.includes("image") ||
    contentType.includes("video") ||
    contentType.includes("audio") ||
    /\.(png|jpg|jpeg|gif|webp|svg|mp4|webm|mp3|wav|ico)(\?|$)/i.test(path)
  )
    return "Media";
  if (contentType.includes("websocket") || path.includes("websocket")) return "WebSocket";
  if (entry.host && (path.startsWith("http:") || contentType.includes("text/plain"))) return "HTTP";
  if (entry.host) return "HTTPS";
  return "Other";
}

export function getEntryProtocolType(entry: RequestLogEntry): string {
  return inferProtocolType(entry);
}

export function getResponseSize(entry: RequestLogEntry): number | null {
  const body = entry.response?.body;
  if (body == null) return null;
  if (typeof body === "string") return new Blob([body]).size;
  return null;
}

export function getStatusText(status: number | undefined | null): string {
  if (status == null) return "—";
  const texts: Record<number, string> = {
    200: "200 OK",
    201: "201 Created",
    204: "204 No Content",
    400: "400 Bad Request",
    401: "401 Unauthorized",
    403: "403 Forbidden",
    404: "404 Not Found",
    500: "500 Internal Server Error",
    502: "502 Bad Gateway",
    503: "503 Service Unavailable",
  };
  return texts[status] ?? `${status}`;
}
