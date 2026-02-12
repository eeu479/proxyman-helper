import type { ReactNode } from "react";

type ModalProps = {
  title: string;
  isOpen: boolean;
  onClose: () => void;
  contentClassName?: string;
  closeLabel?: string;
  children: ReactNode;
};

const Modal = ({
  title,
  isOpen,
  onClose,
  contentClassName,
  closeLabel = "Close modal",
  children,
}: ModalProps) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal" role="dialog" aria-modal="true">
      <div className="modal__backdrop" onClick={onClose} />
      <div className={contentClassName ?? "modal__content"}>
        <header className="modal__header">
          <h3>{title}</h3>
          <button
            type="button"
            className="modal__close"
            onClick={onClose}
            aria-label={closeLabel}
          >
            ✕
          </button>
        </header>
        {children}
      </div>
    </div>
  );
};

export default Modal;
