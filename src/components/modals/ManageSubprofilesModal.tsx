import type { Profile } from "../../types/profile";
import Modal from "./Modal";

type ManageSubprofilesModalProps = {
  isOpen: boolean;
  profiles: Profile[];
  selectedProfile: string;
  isLoading?: boolean;
  errorMessage?: string;
  onClose: () => void;
  onCreate: () => void;
  onEdit: (profileName: string, subprofileName: string) => void;
};

const ManageSubprofilesModal = ({
  isOpen,
  profiles,
  selectedProfile,
  isLoading = false,
  errorMessage,
  onClose,
  onCreate,
  onEdit,
}: ManageSubprofilesModalProps) => {
  const selectedProfileData =
    profiles.find((profile) => profile.name === selectedProfile) ?? null;
  const subprofiles = selectedProfileData?.subProfiles ?? [];
  const canManage = Boolean(selectedProfileData);

  return (
    <Modal
      title="Manage Subprofiles"
      isOpen={isOpen}
      onClose={onClose}
      closeLabel="Close subprofile manager"
      contentClassName="modal__content modal__content--wide"
    >
      <div className="settings__card">
        <header className="settings__card-header">
          <div>
            <h3 className="settings__title">Subprofiles</h3>
            <p className="settings__subtitle">Edit subprofiles for this profile.</p>
          </div>
          <button
            className="settings__primary"
            type="button"
            onClick={onCreate}
            disabled={!canManage}
          >
            Create Subprofile
          </button>
        </header>
        <div className="settings__list">
          {!canManage ? (
            <div className="settings__empty">Select a profile to manage subprofiles.</div>
          ) : isLoading ? (
            <div className="settings__empty">Loading subprofiles...</div>
          ) : subprofiles.length === 0 ? (
            <div className="settings__empty">No subprofiles yet.</div>
          ) : (
            subprofiles.map((subprofile) => (
              <div key={subprofile.name} className="settings__row">
                <input
                  className="settings__input"
                  type="text"
                  value={subprofile.name}
                  readOnly
                />
                <button
                  className="settings__button settings__button--edit"
                  type="button"
                  onClick={() => onEdit(selectedProfile, subprofile.name)}
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

export default ManageSubprofilesModal;
