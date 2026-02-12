import type { FC, FormEvent } from "react";
import Modal from "./Modal";
import type { ParamPair } from "./CreateSubprofileModal";

type EditSubprofileModalProps = {
  isOpen: boolean;
  name: string;
  params: ParamPair[];
  requiredKeys: string[];
  valueByKey: Record<string, string>;
  paramValueInput: string;
  isSubmitting?: boolean;
  errorMessage?: string;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onChangeName: (value: string) => void;
  onChangeValueForKey: (key: string, value: string) => void;
  onChangeParamValue: (value: string) => void;
  onAddExtraParam: () => void;
  onRemoveExtraParam: (key: string) => void;
};

const EditSubprofileModal: FC<EditSubprofileModalProps> = ({
  isOpen,
  name,
  params,
  requiredKeys,
  valueByKey,
  paramValueInput,
  isSubmitting = false,
  errorMessage,
  onClose,
  onSubmit,
  onChangeName,
  onChangeValueForKey,
  onChangeParamValue,
  onAddExtraParam,
  onRemoveExtraParam,
}) => {
  return (
    <Modal
      title="Edit Subprofile"
      isOpen={isOpen}
      onClose={onClose}
      closeLabel="Close edit subprofile"
    >
      <form className="modal__form" onSubmit={onSubmit}>
        <label className="modal__label">
          Name
          <input
            className="modal__input"
            type="text"
            value={name}
            onChange={(event) => onChangeName(event.target.value)}
            placeholder="Subprofile name"
            disabled={isSubmitting}
            required
          />
        </label>
        <label className="modal__label">
          Params
          <div className="settings__param-rows">
            {requiredKeys.map((key) => (
              <div key={key} className="settings__param-row">
                <input className="modal__input" type="text" value={key} disabled />
                <input
                  className="modal__input"
                  type="text"
                  value={valueByKey[key] ?? ""}
                  onChange={(event) => onChangeValueForKey(key, event.target.value)}
                  placeholder="value"
                  disabled={isSubmitting}
                />
              </div>
            ))}
            {requiredKeys.length === 0 ? (
              <span className="settings__chip settings__chip--empty">
                No profile params defined.
              </span>
            ) : null}
          </div>
          <div className="settings__param-grid settings__param-grid--stack">
            <input
              className="modal__input"
              type="text"
              value={paramValueInput}
              onChange={(event) => onChangeParamValue(event.target.value)}
              placeholder="extra value"
              disabled={isSubmitting}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  onAddExtraParam();
                }
              }}
            />
            <button
              className="settings__button settings__button--edit"
              type="button"
              onClick={onAddExtraParam}
              disabled={isSubmitting}
            >
              Add extra
            </button>
          </div>
          <div className="settings__chips">
            {params.length === 0 ? (
              <span className="settings__chip settings__chip--empty">
                No params yet.
              </span>
            ) : (
              params.map((param) => (
                <span key={param.key} className="settings__chip">
                  {param.key}: {param.value}
                  <button
                    type="button"
                    className="settings__chip-remove"
                    onClick={() => onRemoveExtraParam(param.key)}
                    aria-label={`Remove ${param.key}`}
                  >
                    ✕
                  </button>
                </span>
              ))
            )}
          </div>
        </label>
        {errorMessage ? <div className="modal__helper">{errorMessage}</div> : null}
        <div className="modal__actions">
          <button className="panel__action panel__action--ghost" type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="panel__action" type="submit" disabled={isSubmitting}>
            Save Changes
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default EditSubprofileModal;
