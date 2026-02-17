export type TemplateValueType = "string" | "array";

/** For array-type template values: each item has value and optional enabled flag. */
export type ArrayItemEntry = { v: string; e?: boolean };

/** Parse array-type template value string to entries. Legacy string[] is treated as all enabled. */
export function parseArrayItems(value: string): ArrayItemEntry[] {
  if (!value || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];
    const arr = parsed as unknown[];
    if (arr.length === 0) return [];
    const first = arr[0];
    if (typeof first === "string") {
      return (arr as string[]).map((v) => ({ v, e: true }));
    }
    if (first !== null && typeof first === "object" && "v" in first) {
      return (arr as ArrayItemEntry[]).map((item) => ({
        v: typeof item.v === "string" ? item.v : "",
        e: item.e !== false,
      }));
    }
    return [];
  } catch {
    return [];
  }
}

export type TemplateValue = {
  id: string;
  key: string;
  value: string;
  valueType?: TemplateValueType;
};

export type TemplateVariant = {
  id: string;
  name: string;
  values: TemplateValue[];
};

export type Block = {
  id: string;
  name: string;
  method: string;
  path: string;
  description: string;
  category?: string;
  responseTemplate: string;
  responseHeaders: Record<string, string>;
  templateValues: TemplateValue[];
  templateVariants: TemplateVariant[];
  activeVariantId?: string | null;
  /** When set, block is stored in this library (e.g. "local" or remote library id). */
  sourceLibraryId?: string | null;
};
