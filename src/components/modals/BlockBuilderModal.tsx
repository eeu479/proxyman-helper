import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import type { TemplateValue, TemplateValueType } from "../../types/block";
import Modal from "./Modal";

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
  const [isScenariosOpen, setIsScenariosOpen] = useState(false);
  const [isVariantDialogOpen, setIsVariantDialogOpen] = useState(false);
  const [variantNameInput, setVariantNameInput] = useState("");

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
      setIsScenariosOpen(false);
      setIsVariantDialogOpen(false);
      setVariantNameInput("");
    }
  }, [isOpen]);

  // Derived values
  const pathParams = [...builderPath.matchAll(/\{([^}]+)\}/g)].map(
    (m) => m[1],
  );

  const jsonState: "valid" | "invalid" | "empty" = (() => {
    const trimmed = builderResponseTemplate.trim();
    if (!trimmed) return "empty";
    try {
      JSON.parse(trimmed);
      return "valid";
    } catch {
      return "invalid";
    }
  })();

  const previewLine = `${builderMethod} ${builderPath || "/..."}`;

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

  const handleFormKeyDown: React.KeyboardEventHandler<HTMLFormElement> = (
    event,
  ) => {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      event.currentTarget.requestSubmit();
    }
  };

  return (
    <>
      <Modal
        title={isEditing ? "Edit Block" : "Block Builder"}
        isOpen={isOpen}
        onClose={onClose}
        closeLabel="Close block builder"
        contentClassName="modal__content modal__content--wide"
      >
        <form
          className="modal__form"
          onSubmit={onSubmit}
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
                <div className="modal__preview-line">{previewLine}</div>
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
                    placeholder="Optional summary for this request"
                    rows={3}
                  />
                )}
              </div>
            </div>

            {/* RIGHT COLUMN — Response */}
            <div className="modal__col">
              <label className="modal__label">
                <div className="modal__label-row">
                  <span>Response Template</span>
                  <button
                    className="modal__format-btn"
                    type="button"
                    onClick={formatJsonTemplate}
                  >
                    {"{ }"}
                  </button>
                </div>
                <textarea
                  className="modal__input modal__textarea"
                  value={builderResponseTemplate}
                  onChange={(event) =>
                    onChangeResponseTemplate(event.target.value)
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
                    {jsonState === "valid" ? "✓ Valid JSON" : "✗ Invalid JSON"}
                  </span>
                )}
                <span className="modal__hint">
                  {"Use {{key}} for variable substitution"}
                </span>
              </label>

              {/* Response Scenarios (collapsible) */}
              <div className="modal__section">
                <div className="modal__section-header">
                  <button
                    className="modal__desc-toggle"
                    type="button"
                    onClick={() => setIsScenariosOpen(!isScenariosOpen)}
                  >
                    {isScenariosOpen ? "▾" : "▸"} Response Scenarios
                    {builderTemplateVariants.length > 0 &&
                      ` (${builderTemplateVariants.length})`}
                  </button>
                  <button
                    className="panel__action panel__action--ghost"
                    type="button"
                    onClick={() => setIsVariantDialogOpen(true)}
                  >
                    Add Scenario
                  </button>
                </div>
                {isScenariosOpen &&
                  (builderTemplateVariants.length === 0 ? (
                    <div className="modal__empty">No scenarios yet.</div>
                  ) : (
                    <div className="modal__variant-controls">
                      <label className="modal__label">
                        Active Scenario
                        <select
                          className="modal__input"
                          value={activeVariant?.id ?? ""}
                          onChange={(event) =>
                            onSelectTemplateVariant(event.target.value)
                          }
                        >
                          {builderTemplateVariants.map((variant) => (
                            <option key={variant.id} value={variant.id}>
                              {variant.name || "Untitled Scenario"}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="modal__label">
                        Scenario Name
                        <input
                          className="modal__input"
                          type="text"
                          value={activeVariant?.name ?? ""}
                          onChange={(event) =>
                            activeVariant &&
                            onUpdateTemplateVariantName(
                              activeVariant.id,
                              event.target.value,
                            )
                          }
                          placeholder="Scenario name"
                        />
                      </label>
                      <button
                        className="modal__remove"
                        type="button"
                        onClick={() =>
                          activeVariant &&
                          onRemoveTemplateVariant(activeVariant.id)
                        }
                        aria-label="Remove scenario"
                      >
                        Remove Scenario
                      </button>
                    </div>
                  ))}
              </div>

              {/* Template Values */}
              <div className="modal__section">
                <div className="modal__section-header">
                  <span>Template Values</span>
                  <button
                    className="panel__action panel__action--ghost"
                    type="button"
                    onClick={() => onAddTemplateValue()}
                  >
                    Add Value
                  </button>
                </div>
                {visibleTemplateValues.length === 0 ? (
                  <div className="modal__empty">No template values yet.</div>
                ) : (
                  <div className="modal__template-list">
                    {visibleTemplateValues.map((item) => {
                      const type = item.valueType ?? "string";
                      const arrayItems = parseArrayValue(item.value);
                      return (
                        <div key={item.id} className="modal__template-entry">
                          <div className="modal__template-row modal__template-row--4col">
                            <input
                              className="modal__input"
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
                            />
                            <div className="modal__type-toggle">
                              <button
                                className={`modal__type-btn${type === "string" ? " is-active" : ""}`}
                                type="button"
                                onClick={() =>
                                  onUpdateTemplateValueType(item.id, "string")
                                }
                              >
                                Str
                              </button>
                              <button
                                className={`modal__type-btn${type === "array" ? " is-active" : ""}`}
                                type="button"
                                onClick={() =>
                                  onUpdateTemplateValueType(item.id, "array")
                                }
                              >
                                {"[ ]"}
                              </button>
                            </div>
                            <button
                              className="modal__icon-btn"
                              type="button"
                              onClick={() =>
                                onAddTemplateValue(item.key, item.value)
                              }
                              aria-label="Duplicate template value"
                              title="Duplicate"
                            >
                              ⊕
                            </button>
                            <button
                              className="modal__remove"
                              type="button"
                              onClick={() => onRemoveTemplateValue(item.id)}
                              aria-label="Remove template value"
                            >
                              ✕
                            </button>
                          </div>
                          {type === "string" ? (
                            <input
                              className="modal__input"
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
                            />
                          ) : (
                            <div className="modal__array-editor">
                              {arrayItems.map((arrayItem, index) => (
                                <div
                                  key={index}
                                  className="modal__array-item"
                                >
                                  <input
                                    className="modal__input"
                                    type="text"
                                    placeholder={`item ${index + 1}`}
                                    value={arrayItem}
                                    onChange={(event) =>
                                      onUpdateArrayItem(
                                        item.id,
                                        index,
                                        event.target.value,
                                      )
                                    }
                                  />
                                  <button
                                    className="modal__remove"
                                    type="button"
                                    onClick={() =>
                                      onRemoveArrayItem(item.id, index)
                                    }
                                    aria-label="Remove array item"
                                  >
                                    ×
                                  </button>
                                </div>
                              ))}
                              <button
                                className="modal__array-add"
                                type="button"
                                onClick={() => onAddArrayItem(item.id)}
                              >
                                + Add Item
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Response Headers */}
              <div className="modal__section">
                <div className="modal__section-header">
                  <span>Response Headers</span>
                  <button
                    className="panel__action panel__action--ghost"
                    type="button"
                    onClick={() => onAddResponseHeader()}
                  >
                    Add Header
                  </button>
                </div>
                {builderResponseHeaders.length === 0 ? (
                  <div className="modal__empty">No headers yet.</div>
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
            <button className="panel__action" type="submit">
              {isEditing ? "Update Block" : "Save Block"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        title="Add Scenario"
        isOpen={isVariantDialogOpen}
        onClose={() => {
          setIsVariantDialogOpen(false);
          setVariantNameInput("");
        }}
        closeLabel="Close add scenario"
        contentClassName="modal__content modal__content--small"
      >
        <form
          className="modal__form"
          onSubmit={(event) => {
            event.preventDefault();
            onAddTemplateVariant(variantNameInput);
            setIsVariantDialogOpen(false);
            setVariantNameInput("");
          }}
        >
          <label className="modal__label">
            Scenario Name
            <input
              className="modal__input"
              type="text"
              value={variantNameInput}
              onChange={(event) => setVariantNameInput(event.target.value)}
              placeholder="e.g. Success Response"
              autoFocus
            />
          </label>
          <div className="modal__actions">
            <button
              className="panel__action panel__action--ghost"
              type="button"
              onClick={() => {
                setIsVariantDialogOpen(false);
                setVariantNameInput("");
              }}
            >
              Cancel
            </button>
            <button className="panel__action" type="submit">
              Add Scenario
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
};

export default BlockBuilderModal;
