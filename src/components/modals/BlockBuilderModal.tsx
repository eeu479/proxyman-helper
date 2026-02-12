import type { FormEvent } from "react";
import type { TemplateValue } from "../../types/block";
import Modal from "./Modal";

type BlockBuilderModalProps = {
  isOpen: boolean;
  builderName: string;
  builderMethod: string;
  builderPath: string;
  builderDescription: string;
  builderResponseTemplate: string;
  builderTemplateValues: TemplateValue[];
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onChangeName: (value: string) => void;
  onChangeMethod: (value: string) => void;
  onChangePath: (value: string) => void;
  onChangeDescription: (value: string) => void;
  onChangeResponseTemplate: (value: string) => void;
  onAddTemplateValue: () => void;
  onUpdateTemplateValue: (id: string, field: "key" | "value", value: string) => void;
  onRemoveTemplateValue: (id: string) => void;
};

const BlockBuilderModal = ({
  isOpen,
  builderName,
  builderMethod,
  builderPath,
  builderDescription,
  builderResponseTemplate,
  builderTemplateValues,
  onClose,
  onSubmit,
  onChangeName,
  onChangeMethod,
  onChangePath,
  onChangeDescription,
  onChangeResponseTemplate,
  onAddTemplateValue,
  onUpdateTemplateValue,
  onRemoveTemplateValue,
}: BlockBuilderModalProps) => {
  return (
    <Modal
      title="Block Builder"
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
        <label className="modal__label">
          Response Template
          <textarea
            className="modal__input modal__textarea"
            value={builderResponseTemplate}
            onChange={(event) => onChangeResponseTemplate(event.target.value)}
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
        <div className="modal__actions">
          <button className="panel__action panel__action--ghost" type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="panel__action" type="submit">
            Save Block
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default BlockBuilderModal;
