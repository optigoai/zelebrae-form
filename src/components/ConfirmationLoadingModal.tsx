import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

interface ConfirmationLoadingModalProps {
  isOpen: boolean;
}

export const ConfirmationLoadingModal: React.FC<ConfirmationLoadingModalProps> = ({ isOpen }) => {
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    const originalTouchAction = document.body.style.touchAction;
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
    document.body.classList.add('modal-open');

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.touchAction = originalTouchAction;
      document.body.classList.remove('modal-open');
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div 
      className="confirm-loading-overlay" 
      role="dialog" 
      aria-modal="true" 
      aria-label="Confirming"
    >
      <div className="confirm-simple-box animate-scale-in">
        <div className="confirm-spinner-circle" />
        <span className="confirm-simple-text">Confirming...</span>
      </div>
    </div>,
    document.body
  );
};
