import type { Profile } from "../../types/profile";
import Modal from "./Modal";

type ManageProfilesModalProps = {
  isOpen: boolean;
  profiles: Profile[];
  isLoading?: boolean;
  errorMessage?: string;
  onClose: () => void;
  onCreate: () => void;
  onEdit: (profile: Profile) => void;
};

const ManageProfilesModal = ({
  isOpen,
  profiles,
  isLoading = false,
  errorMessage,
  onClose,
  onCreate,
  onEdit,
}: ManageProfilesModalProps) => {
  return (
    <Modal
      title="Manage Profiles"
      isOpen={isOpen}
      onClose={onClose}
      closeLabel="Close profile manager"
      contentClassName="modal__content modal__content--wide"
    >
      <div className="settings__card">
        <header className="settings__card-header">
          <div>
            <h3 className="settings__title">Profiles</h3>
            <p className="settings__subtitle">Edit profiles used in the workspace.</p>
          </div>
          <button className="settings__primary" type="button" onClick={onCreate}>
            Create Profile
          </button>
        </header>
        <div className="settings__list">
          {isLoading ? (
            <div className="settings__empty">Loading profiles...</div>
          ) : profiles.length === 0 ? (
            <div className="settings__empty">No profiles yet.</div>
          ) : (
            profiles.map((profile) => (
              <div key={profile.name} className="settings__row">
                <input
                  className="settings__input"
                  type="text"
                  value={profile.name}
                  readOnly
                />
                <button
                  className="settings__button settings__button--edit"
                  type="button"
                  onClick={() => onEdit(profile)}
                >
                  Edit
                </button>
              </div>
            ))
          )}
          {errorMessage ? <div className="settings__empty">{errorMessage}</div> : null}
        </div>
      </div>
    </Modal>
  );
};

export default ManageProfilesModal;
