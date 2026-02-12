import type { FC, FormEvent } from "react";
import Modal from "./Modal";

export type EditProfileModalProps = {
  isOpen: boolean;
  name: string;
  baseUrl: string;
  params: string[];
  paramInput: string;
  isSubmitting?: boolean;
  errorMessage?: string;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onChangeName: (value: string) => void;
  onChangeBaseUrl: (value: string) => void;
  onChangeParamInput: (value: string) => void;
  onAddParam: () => void;
  onRemoveParam: (value: string) => void;
};

const EditProfileModal: FC<EditProfileModalProps> = ({
  isOpen,
  name,
  baseUrl,
  params,
  paramInput,
  isSubmitting = false,
  errorMessage,
  onClose,
  onSubmit,
  onChangeName,
  onChangeBaseUrl,
  onChangeParamInput,
  onAddParam,
  onRemoveParam,
}) => {
  return (
    <Modal
      title="Edit Profile"
      isOpen={isOpen}
      onClose={onClose}
      closeLabel="Close edit profile"
    >
      <form className="modal__form" onSubmit={onSubmit}>
        <label className="modal__label">
          Name
          <input
            className="modal__input"
            type="text"
            value={name}
            onChange={(event) => onChangeName(event.target.value)}
            placeholder="Profile name"
            disabled={isSubmitting}
            required
          />
        </label>
        <label className="modal__label">
          Base URL
          <input
            className="modal__input"
            type="text"
            value={baseUrl}
            onChange={(event) => onChangeBaseUrl(event.target.value)}
            placeholder="https://api.example.com"
            disabled={isSubmitting}
          />
        </label>
        <label className="modal__label">
          Params
          <div className="settings__param-row">
            <input
              className="modal__input"
              type="text"
              value={paramInput}
              onChange={(event) => onChangeParamInput(event.target.value)}
              placeholder="Add param"
              disabled={isSubmitting}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  onAddParam();
                }
              }}
            />
            <button
              className="settings__button settings__button--edit"
              type="button"
              onClick={onAddParam}
              disabled={isSubmitting}
            >
              Add
            </button>
          </div>
          <div className="settings__chips">
            {params.length === 0 ? (
              <span className="settings__chip settings__chip--empty">
                No params yet.
              </span>
            ) : (
              params.map((param) => (
                <span key={param} className="settings__chip">
                  {param}
                  <button
                    type="button"
                    className="settings__chip-remove"
                    onClick={() => onRemoveParam(param)}
                    aria-label={`Remove ${param}`}
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

export default EditProfileModal;
