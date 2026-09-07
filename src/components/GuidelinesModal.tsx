import React from 'react';
import { X, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { GUIDELINES_LIST } from '../config/constants';

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

  return (
    <div 
      className="modal-overlay" 
      onClick={onClose} 
      onTouchMove={(e) => {
        if (e.target === e.currentTarget) {
          e.preventDefault();
        }
      }}
      role="dialog" 
      aria-modal="true" 
      aria-labelledby="guidelines-modal-title"
    >
      <div 
        className="modal-content" 
        onClick={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <ShieldAlert size={22} color="#FDE68A" />
            <h3 id="guidelines-modal-title">Celebration Area Guidelines</h3>
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

        <div className="modal-body">
          <div className="guidelines-poster-wrap">
            <img
              src="/Guidelines.jpg"
              alt="Official Zelebrae Celebration Area Guidelines Poster"
              className="guidelines-poster-img"
              loading="lazy"
            />
          </div>

          <p style={{ fontSize: '0.88rem', color: 'var(--color-brand-purple)', fontWeight: 600 }}>
            This celebration space is complimentary for Zelebrae customers. Kindly follow the rules below for a smooth, memorable experience:
          </p>

          <ol className="rules-list">
            {GUIDELINES_LIST.map((rule, index) => (
              <li key={index} className="rule-item">
                <span className="rule-number">{index + 1}</span>
                <span>{rule}</span>
              </li>
            ))}
          </ol>
        </div>

        <div className="modal-footer" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
            Zelebrae Pastries • Kozhikode
          </span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} style={{ padding: '0.5rem 1rem' }}>
              Close
            </button>
            {onAgreeAndClose && (
              <button 
                type="button" 
                className="btn btn-cta" 
                onClick={onAgreeAndClose}
                style={{ padding: '0.5rem 1.2rem' }}
              >
                <CheckCircle2 size={16} />
                I Understand & Agree
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
