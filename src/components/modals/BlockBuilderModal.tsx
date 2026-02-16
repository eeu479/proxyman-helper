import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import type { TemplateValue } from "../../types/block";
import Modal from "./Modal";

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
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onChangeName: (value: string) => void;
  onChangeMethod: (value: string) => void;
  onChangePath: (value: string) => void;
  onChangeDescription: (value: string) => void;
  onChangeResponseTemplate: (value: string) => void;
  onAddResponseHeader: (key?: string, value?: string) => void;
  onUpdateResponseHeader: (id: string, field: "key" | "value", value: string) => void;
  onRemoveResponseHeader: (id: string) => void;
  onAddTemplateValue: (key?: string, value?: string) => void;
  onUpdateTemplateValue: (id: string, field: "key" | "value", value: string) => void;
  onRemoveTemplateValue: (id: string) => void;
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
  onClose,
  onSubmit,
  onChangeName,
  onChangeMethod,
  onChangePath,
  onChangeDescription,
  onChangeResponseTemplate,
  onAddResponseHeader,
  onUpdateResponseHeader,
  onRemoveResponseHeader,
  onAddTemplateValue,
  onUpdateTemplateValue,
  onRemoveTemplateValue,
}: BlockBuilderModalProps) => {
  const [activeTab, setActiveTab] = useState<"response" | "headers">("response");

  useEffect(() => {
    if (isOpen) {
      setActiveTab("response");
    }
  }, [isOpen]);

  const formatJsonTemplate = () => {
    const trimmed = builderResponseTemplate.trim();
    if (!trimmed) {
      return;
    }
    try {
      const parsed = JSON.parse(trimmed);
      onChangeResponseTemplate(JSON.stringify(parsed, null, 2));
    } catch {
      // Leave as-is when it is not valid JSON.
    }
  };

  const handleTemplateKeyDown: React.KeyboardEventHandler<HTMLTextAreaElement> = (
    event
  ) => {
    if (event.key !== "Tab") {
      return;
    }
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

  return (
    <Modal
      title={isEditing ? "Edit Block" : "Block Builder"}
      isOpen={isOpen}
      onClose={onClose}
      closeLabel="Close block builder"
    >
      <form className="modal__form" onSubmit={onSubmit}>
        <label className="modal__label">
          Name
          <input
            className="modal__input"
            type="text"
            value={builderName}
            onChange={(event) => onChangeName(event.target.value)}
            placeholder="Create Session"
            required
          />
        </label>
        <div className="modal__row">
          <label className="modal__label">
            Method
            <select
              className="modal__input"
              value={builderMethod}
              onChange={(event) => onChangeMethod(event.target.value)}
            >
              {["GET", "POST", "PUT", "PATCH", "DELETE"].map((method) => (
                <option key={method} value={method}>
                  {method}
                </option>
              ))}
            </select>
          </label>
          <label className="modal__label">
            Path
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
        <label className="modal__label">
          Description
          <textarea
            className="modal__input modal__textarea"
            value={builderDescription}
            onChange={(event) => onChangeDescription(event.target.value)}
            placeholder="Optional summary for this request"
            rows={3}
          />
        </label>
        <div className="modal__tabs" role="tablist" aria-label="Block response">
          <button
            className={`modal__tab ${activeTab === "response" ? "is-active" : ""}`}
            type="button"
            role="tab"
            aria-selected={activeTab === "response"}
            onClick={() => setActiveTab("response")}
          >
            Response
          </button>
          <button
            className={`modal__tab ${activeTab === "headers" ? "is-active" : ""}`}
            type="button"
            role="tab"
            aria-selected={activeTab === "headers"}
            onClick={() => setActiveTab("headers")}
          >
            Headers
          </button>
        </div>
        {activeTab === "response" ? (
          <>
            <label className="modal__label">
              Response Template
              <textarea
                className="modal__input modal__textarea"
                value={builderResponseTemplate}
                onChange={(event) => onChangeResponseTemplate(event.target.value)}
                onBlur={formatJsonTemplate}
                onKeyDown={handleTemplateKeyDown}
                placeholder='e.g. { "status": "ok", "userId": "{{userId}}" }'
                rows={4}
              />
            </label>
            <div className="modal__section">
              <div className="modal__section-header">
                <span>Template Values</span>
                <button
                  className="panel__action panel__action--ghost"
                  type="button"
                  onClick={onAddTemplateValue}
                >
                  Add Value
                </button>
              </div>
              {builderTemplateValues.length === 0 ? (
                <div className="modal__empty">No template values yet.</div>
              ) : (
                <div className="modal__template-list">
                  {builderTemplateValues.map((item) => (
                    <div key={item.id} className="modal__template-row">
                      <input
                        className="modal__input"
                        type="text"
                        placeholder="key"
                        value={item.key}
                        onChange={(event) =>
                          onUpdateTemplateValue(item.id, "key", event.target.value)
                        }
                      />
                      <input
                        className="modal__input"
                        type="text"
                        placeholder="value"
                        value={item.value}
                        onChange={(event) =>
                          onUpdateTemplateValue(item.id, "value", event.target.value)
                        }
                      />
                      <button
                        className="modal__remove"
                        type="button"
                        onClick={() => onRemoveTemplateValue(item.id)}
                        aria-label="Remove template value"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="modal__section">
            <div className="modal__section-header">
              <span>Response Headers</span>
              <button
                className="panel__action panel__action--ghost"
                type="button"
                onClick={onAddResponseHeader}
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
                        onUpdateResponseHeader(item.id, "key", event.target.value)
                      }
                    />
                    <input
                      className="modal__input"
                      type="text"
                      placeholder="Header value"
                      value={item.value}
                      onChange={(event) =>
                        onUpdateResponseHeader(item.id, "value", event.target.value)
                      }
                    />
                    <button
                      className="modal__remove"
                      type="button"
                      onClick={() => onRemoveResponseHeader(item.id)}
                      aria-label="Remove response header"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        <div className="modal__actions">
          <button className="panel__action panel__action--ghost" type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="panel__action" type="submit">
            {isEditing ? "Update Block" : "Save Block"}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default BlockBuilderModal;
