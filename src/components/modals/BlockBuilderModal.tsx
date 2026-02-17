import type { FormEvent } from "react";
import { useEffect, useRef, useState } from "react";
import type { TemplateValue, TemplateValueType } from "../../types/block";
import Modal from "./Modal";

/** Replace curly/smart quotes with straight ASCII quotes. */
const normalizeStraightQuotes = (s: string): string =>
  s.replace(/[\u201C\u201D\u201E\u201F\u2033\u2036]/g, '"')
   .replace(/[\u2018\u2019\u201A\u201B\u2032\u2035]/g, "'");

const parseArrayValue = (value: string): string[] => {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    if (Array.isArray(parsed)) return parsed as string[];
    return [];
  } catch {
    return [];
  }
};

type BlockBuilderModalProps = {
  isOpen: boolean;
  isEditing: boolean;
  builderName: string;
  builderMethod: string;
  builderPath: string;
  builderDescription: string;
  builderResponseTemplate: string;
  builderResponseHeaders: { id: string; key: string; value: string }[];
  builderTemplateValues: TemplateValue[];
  builderTemplateVariants: {
    id: string;
    name: string;
    values: TemplateValue[];
  }[];
  builderActiveVariantId: string | null;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onSaveAndCreateAnother?: (event: FormEvent<HTMLFormElement>) => void;
  onChangeName: (value: string) => void;
  onChangeMethod: (value: string) => void;
  onChangePath: (value: string) => void;
  onChangeDescription: (value: string) => void;
  onChangeResponseTemplate: (value: string) => void;
  onSelectTemplateVariant: (value: string) => void;
  onAddTemplateVariant: (name?: string) => void;
  onRemoveTemplateVariant: (variantId: string) => void;
  onUpdateTemplateVariantName: (variantId: string, value: string) => void;
  onAddResponseHeader: (key?: string, value?: string) => void;
  onUpdateResponseHeader: (
    id: string,
    field: "key" | "value",
    value: string,
  ) => void;
  onRemoveResponseHeader: (id: string) => void;
  onAddTemplateValue: (key?: string, value?: string) => void;
  onUpdateTemplateValue: (
    id: string,
    field: "key" | "value",
    value: string,
  ) => void;
  onRemoveTemplateValue: (id: string) => void;
  onUpdateTemplateValueType: (id: string, valueType: TemplateValueType) => void;
  onAddArrayItem: (valueId: string) => void;
  onUpdateArrayItem: (valueId: string, index: number, text: string) => void;
  onRemoveArrayItem: (valueId: string, index: number) => void;
};

const BlockBuilderModal = ({
  isOpen,
  isEditing,
  builderName,
  builderMethod,
  builderPath,
  builderDescription,
  builderResponseTemplate,
  builderResponseHeaders,
  builderTemplateValues,
  builderTemplateVariants,
  builderActiveVariantId,
  onClose,
  onSubmit,
  onSaveAndCreateAnother,
  onChangeName,
  onChangeMethod,
  onChangePath,
  onChangeDescription,
  onChangeResponseTemplate,
  onSelectTemplateVariant,
  onAddTemplateVariant,
  onRemoveTemplateVariant,
  onUpdateTemplateVariantName,
  onAddResponseHeader,
  onUpdateResponseHeader,
  onRemoveResponseHeader,
  onAddTemplateValue,
  onUpdateTemplateValue,
  onRemoveTemplateValue,
  onUpdateTemplateValueType,
  onAddArrayItem,
  onUpdateArrayItem,
  onRemoveArrayItem,
}: BlockBuilderModalProps) => {
  const [isDescriptionOpen, setIsDescriptionOpen] = useState(false);
  const [editingVariantId, setEditingVariantId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const createAnotherRef = useRef(false);

  const activeVariant =
    builderTemplateVariants.find(
      (variant) => variant.id === builderActiveVariantId,
    ) ?? builderTemplateVariants[0];
  const visibleTemplateValues =
    builderTemplateVariants.length > 0
      ? (activeVariant?.values ?? [])
      : builderTemplateValues;

  useEffect(() => {
    if (isOpen) {
      setIsDescriptionOpen(false);
      setEditingVariantId(null);
      setEditingName("");
    }
  }, [isOpen]);

  const startEditing = (variantId: string, name: string) => {
    setEditingVariantId(variantId);
    setEditingName(name);
  };

  const commitRename = () => {
    if (editingVariantId) {
      onUpdateTemplateVariantName(editingVariantId, editingName);
    }
    setEditingVariantId(null);
    setEditingName("");
  };

  const cancelRename = () => {
    setEditingVariantId(null);
    setEditingName("");
  };

  // Derived values
  const pathParams = [...builderPath.matchAll(/\{([^}]+)\}/g)].map(
    (m) => m[1],
  );

  const jsonValidation: {
    state: "valid" | "invalid" | "empty";
    errorLine?: number;
  } = (() => {
    const trimmed = builderResponseTemplate.trim();
    if (!trimmed) return { state: "empty" };
    // Replace {{...}} template tokens with valid JSON placeholders so that
    // templates with variables don't falsely report invalid JSON.
    // Handle both quoted ("{{key}}") and unquoted ({{key}}) usages.
    const sanitized = trimmed
      .replace(/"\{\{[^}]+\}\}"/g, '"__placeholder__"')
      .replace(/\{\{[^}]+\}\}/g, '"__placeholder__"');
    try {
      JSON.parse(sanitized);
      return { state: "valid" };
    } catch (e) {
      if (e instanceof SyntaxError) {
        const msg = e.message;
        const lineMatch = /line (\d+)/i.exec(msg);
        if (lineMatch) {
          return { state: "invalid", errorLine: parseInt(lineMatch[1]) };
        }
        const posMatch = /position (\d+)/i.exec(msg);
        if (posMatch) {
          const pos = parseInt(posMatch[1]);
          const errorLine =
            (trimmed.slice(0, pos).match(/\n/g) ?? []).length + 1;
          return { state: "invalid", errorLine };
        }
      }
      return { state: "invalid" };
    }
  })();
  const jsonState = jsonValidation.state;

  const previewLine = `${builderMethod} ${builderPath || "/..."}`;

  const undefinedTokens = (() => {
    const tokens = [
      ...builderResponseTemplate.matchAll(/\{\{([^}]+)\}\}/g),
    ]
      .map((m) => m[1]?.trim())
      .filter((t): t is string => Boolean(t));
    const definedKeys = new Set(visibleTemplateValues.map((v) => v.key));
    return [...new Set(tokens)].filter((t) => !definedKeys.has(t));
  })();

  const copyTemplate = () => {
    void navigator.clipboard.writeText(builderResponseTemplate);
  };

  const formatJsonTemplate = () => {
    const trimmed = builderResponseTemplate.trim();
    if (!trimmed) return;
    try {
      const parsed = JSON.parse(trimmed);
      onChangeResponseTemplate(JSON.stringify(parsed, null, 2));
    } catch {
      // Leave as-is when it is not valid JSON.
    }
  };

  const handleTemplateKeyDown: React.KeyboardEventHandler<
    HTMLTextAreaElement
  > = (event) => {
    if (event.key !== "Tab") return;
    event.preventDefault();
    const target = event.currentTarget;
    const start = target.selectionStart ?? 0;
    const end = target.selectionEnd ?? 0;
    const nextValue =
      builderResponseTemplate.slice(0, start) +
      "\t" +
      builderResponseTemplate.slice(end);
    onChangeResponseTemplate(nextValue);
    requestAnimationFrame(() => {
      target.selectionStart = start + 1;
      target.selectionEnd = start + 1;
    });
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    if (createAnotherRef.current && onSaveAndCreateAnother) {
      createAnotherRef.current = false;
      onSaveAndCreateAnother(event);
    } else {
      createAnotherRef.current = false;
      onSubmit(event);
    }
  };

  const handleFormKeyDown: React.KeyboardEventHandler<HTMLFormElement> = (
    event,
  ) => {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      event.currentTarget.requestSubmit();
    }
  };

  return (
      <Modal
        title={isEditing ? "Edit Endpoint" : "Endpoint Builder"}
        isOpen={isOpen}
        onClose={onClose}
        closeLabel="Close endpoint builder"
        contentClassName="modal__content modal__content--wide"
      >
        <form
          className="modal__form"
          onSubmit={handleSubmit}
          onKeyDown={handleFormKeyDown}
        >
          <div className="modal__two-col">
            {/* LEFT COLUMN — Request Identity */}
            <div className="modal__col">
              <label className="modal__label">
                <span>
                  Name <span className="modal__required">*</span>
                </span>
                <input
                  className="modal__input"
                  type="text"
                  value={builderName}
                  onChange={(event) => onChangeName(event.target.value)}
                  placeholder="Create Session"
                  required
                />
              </label>

              <div className="modal__col" style={{ gap: "8px" }}>
                <div className="modal__identity-strip">
                  <label
                    className="modal__label"
                    style={{ flex: "0 0 110px" }}
                  >
                    Method
                    <select
                      className="modal__input"
                      value={builderMethod}
                      onChange={(event) => onChangeMethod(event.target.value)}
                    >
                      {["GET", "POST", "PUT", "PATCH", "DELETE"].map(
                        (method) => (
                          <option key={method} value={method}>
                            {method}
                          </option>
                        ),
                      )}
                    </select>
                  </label>
                  <label className="modal__label" style={{ flex: 1 }}>
                    <span>
                      Path <span className="modal__required">*</span>
                    </span>
                    <input
                      className="modal__input"
                      type="text"
                      value={builderPath}
                      onChange={(event) => onChangePath(event.target.value)}
                      placeholder="/api/session"
                      required
                    />
                  </label>
                </div>
                <div className="modal__preview-line">
                  <span className="modal__preview-icon">🌐</span>
                  <span>
                    {isEditing ? "Edits endpoint:" : "Creates endpoint:"}{" "}
                    {previewLine}
                  </span>
                </div>
                {pathParams.length > 0 && (
                  <div className="modal__path-params">
                    {pathParams.map((param) => (
                      <span key={param} className="modal__path-chip">
                        {`{${param}}`}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="modal__desc-section">
                <button
                  className="modal__desc-toggle"
                  type="button"
                  onClick={() => setIsDescriptionOpen(!isDescriptionOpen)}
                >
                  {isDescriptionOpen ? "▾ Description" : "▸ Description"}
                </button>
                {isDescriptionOpen && (
                  <textarea
                    className="modal__input modal__textarea"
                    aria-label="Description"
                    value={builderDescription}
                    onChange={(event) =>
                      onChangeDescription(event.target.value)
                    }
                    placeholder="Optional notes about this endpoint"
                    rows={3}
                  />
                )}
              </div>
            </div>

            {/* RIGHT COLUMN — Response */}
            <div className="modal__col">
              <label className="modal__label">
                <div className="modal__label-row">
                  <span>
                    Response Template{" "}
                    <span
                      title="The JSON body returned by this endpoint"
                      className="modal__tooltip-icon"
                    >
                      ⓘ
                    </span>
                  </span>
                  <div className="modal__toolbar">
                    <button
                      className="modal__format-btn"
                      type="button"
                      onClick={copyTemplate}
                      title="Copy template to clipboard"
                    >
                      ⧉
                    </button>
                    <button
                      className="modal__format-btn"
                      type="button"
                      onClick={formatJsonTemplate}
                      title="Format JSON"
                    >
                      {"{ }"}
                    </button>
                  </div>
                </div>
                <textarea
                  className="modal__input modal__textarea"
                  value={builderResponseTemplate}
                  onChange={(event) =>
                    onChangeResponseTemplate(
                      normalizeStraightQuotes(event.target.value),
                    )
                  }
                  onBlur={formatJsonTemplate}
                  onKeyDown={handleTemplateKeyDown}
                  placeholder='e.g. { "status": "ok", "userId": "{{userId}}" }'
                  rows={6}
                />
                {jsonState !== "empty" && (
                  <span
                    className={`modal__json-state modal__json-state--${jsonState}`}
                  >
                    {jsonState === "valid"
                      ? "✓ Valid JSON"
                      : jsonValidation.errorLine !== undefined
                        ? `✗ Invalid JSON — line ${jsonValidation.errorLine}`
                        : "✗ Invalid JSON"}
                  </span>
                )}
                {undefinedTokens.length > 0 && (
                  <div className="modal__token-warnings">
                    {undefinedTokens.map((token) => (
                      <span key={token} className="modal__token-warning">
                        {`⚠ Undefined variable: {{${token}}}`}
                      </span>
                    ))}
                  </div>
                )}
                <span className="modal__hint">
                  {"Use {{key}} for variable substitution"}
                </span>
              </label>

              {/* Response Scenarios (pill tabs) */}
              <div className="modal__section">
                <div className="modal__section-header">
                  <span>
                    Response Scenarios{" "}
                    <span
                      title="Alternative value sets for testing different cases"
                      className="modal__tooltip-icon"
                    >
                      ⓘ
                    </span>
                  </span>
                </div>
                {builderTemplateVariants.length === 0 ? (
                  <button
                    className="modal__scenario-empty"
                    type="button"
                    onClick={() => onAddTemplateVariant()}
                  >
                    Add scenario to test different responses
                  </button>
                ) : (
                  <div className="modal__scenario-tabs">
                    {builderTemplateVariants.map((variant) => (
                      <button
                        key={variant.id}
                        className={`modal__scenario-tab${variant.id === (activeVariant?.id ?? "") ? " is-active" : ""}`}
                        type="button"
                        onClick={() => onSelectTemplateVariant(variant.id)}
                      >
                        {editingVariantId === variant.id ? (
                          <input
                            className="modal__scenario-tab-input"
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            onBlur={commitRename}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") commitRename();
                              if (e.key === "Escape") cancelRename();
                            }}
                            onClick={(e) => e.stopPropagation()}
                            autoFocus
                          />
                        ) : (
                          <span
                            className="modal__scenario-tab-label"
                            onDoubleClick={(e) => {
                              e.stopPropagation();
                              startEditing(variant.id, variant.name);
                            }}
                          >
                            {variant.name || "Untitled"}
                          </span>
                        )}
                        <span
                          className="modal__scenario-tab-remove"
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemoveTemplateVariant(variant.id);
                          }}
                          role="button"
                          aria-label="Remove scenario"
                        >
                          ✕
                        </span>
                      </button>
                    ))}
                    <button
                      className="modal__scenario-add"
                      type="button"
                      onClick={() => onAddTemplateVariant()}
                      title="Add scenario"
                    >
                      +
                    </button>
                  </div>
                )}
              </div>

              {/* Template Values — Table: Key | Value | Type | Actions. Row = cohesive unit; Enter adds row; Backspace in empty key removes row. */}
              <div className="modal__section">
                <div className="modal__section-header">
                  <span>
                    Template Values{" "}
                    <span
                      title="Variables replaced in the response using {{key}} syntax"
                      className="modal__tooltip-icon"
                    >
                      ⓘ
                    </span>
                  </span>
                  <button
                    className="panel__action panel__action--ghost"
                    type="button"
                    onClick={() => onAddTemplateValue()}
                  >
                    Add Value
                  </button>
                </div>
                {visibleTemplateValues.length === 0 ? (
                  <div className="modal__empty modal__empty--template">
                    Define variables used in your response template
                  </div>
                ) : (
                  <div
                    className="modal__template-table"
                    role="table"
                    aria-label="Template values"
                  >
                    <div className="modal__template-thead" role="rowgroup">
                      <div
                        className="modal__template-th modal__template-th--key"
                        role="columnheader"
                      >
                        Key
                      </div>
                      <div
                        className="modal__template-th modal__template-th--value"
                        role="columnheader"
                      >
                        Value
                      </div>
                      <div
                        className="modal__template-th modal__template-th--type"
                        role="columnheader"
                      >
                        Type
                      </div>
                      <div
                        className="modal__template-th modal__template-th--action"
                        role="columnheader"
                      >
                        {" "}
                      </div>
                    </div>
                    <div className="modal__template-tbody" role="rowgroup">
                      {visibleTemplateValues.map((item, index) => {
                        const type = item.valueType ?? "string";
                        const arrayItems = parseArrayValue(item.value);
                        const isOnlyRow =
                          visibleTemplateValues.length === 1;
                        return (
                          <div
                            key={item.id}
                            className="modal__template-tr"
                            role="row"
                          >
                            <div
                              className="modal__template-td modal__template-td--key"
                              role="cell"
                            >
                              <input
                                className="modal__input modal__input--row"
                                type="text"
                                placeholder="key"
                                value={item.key}
                                onChange={(event) =>
                                  onUpdateTemplateValue(
                                    item.id,
                                    "key",
                                    event.target.value,
                                  )
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    onAddTemplateValue();
                                  }
                                  if (
                                    e.key === "Backspace" &&
                                    !item.key &&
                                    !isOnlyRow
                                  ) {
                                    e.preventDefault();
                                    onRemoveTemplateValue(item.id);
                                  }
                                }}
                              />
                            </div>
                            <div
                              className="modal__template-td modal__template-td--value"
                              role="cell"
                            >
                              {type === "string" ? (
                                <input
                                  className="modal__input modal__input--row"
                                  type="text"
                                  placeholder="value"
                                  value={item.value}
                                  onChange={(event) =>
                                    onUpdateTemplateValue(
                                      item.id,
                                      "value",
                                      event.target.value,
                                    )
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault();
                                      onAddTemplateValue();
                                    }
                                  }}
                                />
                              ) : (
                                <div className="modal__template-array">
                                  {arrayItems.map((arrayItem, idx) => (
                                    <span
                                      key={idx}
                                      className="modal__template-chip"
                                    >
                                      <input
                                        className="modal__input modal__input--chip"
                                        type="text"
                                        placeholder="item"
                                        value={arrayItem}
                                        onChange={(event) =>
                                          onUpdateArrayItem(
                                            item.id,
                                            idx,
                                            event.target.value,
                                          )
                                        }
                                        aria-label={`Array item ${idx + 1}`}
                                      />
                                      <button
                                        type="button"
                                        className="modal__template-chip-remove"
                                        onClick={() =>
                                          onRemoveArrayItem(item.id, idx)
                                        }
                                        aria-label="Remove array item"
                                      >
                                        ×
                                      </button>
                                    </span>
                                  ))}
                                  <button
                                    type="button"
                                    className="modal__template-array-add"
                                    onClick={() => onAddArrayItem(item.id)}
                                  >
                                    + Add
                                  </button>
                                </div>
                              )}
                            </div>
                            <div
                              className="modal__template-td modal__template-td--type"
                              role="cell"
                            >
                              <div
                                className="modal__type-toggle"
                                role="group"
                                aria-label="Value type"
                              >
                                <button
                                  className={`modal__type-btn${type === "string" ? " is-active" : ""}`}
                                  type="button"
                                  onClick={() =>
                                    onUpdateTemplateValueType(
                                      item.id,
                                      "string",
                                    )
                                  }
                                  aria-pressed={type === "string"}
                                  aria-label="String"
                                >
                                  Str
                                </button>
                                <button
                                  className={`modal__type-btn${type === "array" ? " is-active" : ""}`}
                                  type="button"
                                  onClick={() =>
                                    onUpdateTemplateValueType(
                                      item.id,
                                      "array",
                                    )
                                  }
                                  aria-pressed={type === "array"}
                                  aria-label="Array"
                                >
                                  {"[ ]"}
                                </button>
                              </div>
                            </div>
                            <div
                              className="modal__template-td modal__template-td--action"
                              role="cell"
                            >
                              <div className="modal__template-actions">
                                <button
                                  className="modal__template-action modal__template-action--del"
                                  type="button"
                                  onClick={() =>
                                    onRemoveTemplateValue(item.id)
                                  }
                                  aria-label="Remove row"
                                  title="Remove"
                                >
                                  ✕
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Response Headers */}
              <div className="modal__section">
                <div className="modal__section-header">
                  <span>Response Headers</span>
                  <div className="modal__header-actions">
                    <button
                      className="modal__format-btn"
                      type="button"
                      onClick={() =>
                        onAddResponseHeader(
                          "Content-Type",
                          "application/json",
                        )
                      }
                      title="Add Content-Type: application/json"
                    >
                      JSON
                    </button>
                    <button
                      className="modal__format-btn"
                      type="button"
                      onClick={() =>
                        onAddResponseHeader("Access-Control-Allow-Origin", "*")
                      }
                      title="Add Access-Control-Allow-Origin: *"
                    >
                      CORS
                    </button>
                    <button
                      className="panel__action panel__action--ghost"
                      type="button"
                      onClick={() => onAddResponseHeader()}
                    >
                      Add Header
                    </button>
                  </div>
                </div>
                {builderResponseHeaders.length === 0 ? (
                  <div className="modal__empty">
                    Add headers returned with this response (e.g. Content-Type)
                  </div>
                ) : (
                  <div className="modal__template-list">
                    {builderResponseHeaders.map((item) => (
                      <div key={item.id} className="modal__template-row">
                        <input
                          className="modal__input"
                          type="text"
                          placeholder="Header name"
                          value={item.key}
                          onChange={(event) =>
                            onUpdateResponseHeader(
                              item.id,
                              "key",
                              event.target.value,
                            )
                          }
                        />
                        <input
                          className="modal__input"
                          type="text"
                          placeholder="Header value"
                          value={item.value}
                          onChange={(event) =>
                            onUpdateResponseHeader(
                              item.id,
                              "value",
                              event.target.value,
                            )
                          }
                        />
                        <button
                          className="modal__remove"
                          type="button"
                          onClick={() => onRemoveResponseHeader(item.id)}
                          aria-label="Remove response header"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Full-width footer */}
          <div className="modal__summary">
            {isEditing ? "Editing endpoint:" : "Creates endpoint:"}{" "}
            {previewLine}
          </div>
          <div className="modal__actions">
            <button
              className="panel__action panel__action--ghost"
              type="button"
              onClick={onClose}
            >
              Cancel
            </button>
            {!isEditing && onSaveAndCreateAnother && (
              <button
                className="panel__action panel__action--ghost"
                type="submit"
                onClick={() => {
                  createAnotherRef.current = true;
                }}
              >
                Save & Create Another
              </button>
            )}
            <button className="panel__action" type="submit">
              {isEditing ? "Update Endpoint" : "Save Endpoint"}
            </button>
          </div>
        </form>
      </Modal>
  );
};

export default BlockBuilderModal;
