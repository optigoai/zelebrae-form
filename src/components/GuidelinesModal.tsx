import React from 'react';
import { createPortal } from 'react-dom';
import { X, ShieldAlert, CheckCircle2 } from 'lucide-react';

interface GuidelinesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAgreeAndClose?: () => void;
}

export const GuidelinesModal: React.FC<GuidelinesModalProps> = ({
  isOpen,
  onClose,
  onAgreeAndClose
}) => {
  // Prevent background scrolling while modal is open
  React.useEffect(() => {
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
      className="modal-overlay" 
      onClick={onClose} 
      role="dialog" 
      aria-modal="true" 
      aria-labelledby="guidelines-modal-title"
    >
      <div 
        className="modal-content guidelines-modal-content" 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header guidelines-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <ShieldAlert size={22} color="#FDE68A" />
            <h3 id="guidelines-modal-title" style={{ margin: 0, fontSize: '1.15rem' }}>Celebration Area Guidelines</h3>
          </div>
          <button 
            type="button" 
            className="modal-close-btn" 
            onClick={onClose} 
            aria-label="Close guidelines modal"
          >
            <X size={18} />
          </button>
        </div>

        <div className="guidelines-modal-body">
          <div className="guidelines-poster-container">
            <img
              src="/images/celebration-guidelines.jpg"
              alt="Official Zelebrae Celebration Area Guidelines Poster"
              className="guidelines-poster-full-img"
            />
          </div>
        </div>

        <div className="modal-footer guidelines-modal-footer">
          <span className="guidelines-footer-brand">
            Zelebrae Pastries • Kozhikode
          </span>
          <div className="guidelines-footer-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose} style={{ padding: '0.5rem 1rem' }}>
              Close
            </button>
            {onAgreeAndClose && (
              <button 
                type="button" 
                className="btn btn-cta" 
                onClick={onAgreeAndClose}
                style={{ padding: '0.5rem 1.2rem', gap: '0.4rem' }}
              >
                <CheckCircle2 size={16} />
                <span>I Understand & Agree</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
