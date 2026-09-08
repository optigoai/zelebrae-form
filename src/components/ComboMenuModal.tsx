import React from 'react';
import { X, Sparkles, ExternalLink, Check } from 'lucide-react';
import { ComboItem } from '../types/booking';

interface ComboMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  combos: ComboItem[];
  menuPdfUrl?: string;
  onSelectCombo: (id: string) => void;
  selectedComboId: string;
}

export const ComboMenuModal: React.FC<ComboMenuModalProps> = ({
  isOpen,
  onClose,
  combos,
  menuPdfUrl,
  onSelectCombo,
  selectedComboId
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="combo-menu-title">
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '680px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sparkles size={20} color="#FDE68A" />
            <h3 id="combo-menu-title">Zelebrae Celebration Combo Menu</h3>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close menu">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <p style={{ fontSize: '0.88rem', color: 'var(--color-text-muted)' }}>
            Elevate your celebration experience with our curated party packs. All decor props and accessories are set up in advance for your arrival.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.5rem' }}>
            {combos.filter(c => c.id !== 'none').map((combo) => (
              <div 
                key={combo.id}
                style={{
                  padding: '1.2rem',
                  borderRadius: 'var(--radius-lg)',
                  border: selectedComboId === combo.id ? '2px solid var(--color-brand-purple)' : '1px solid var(--color-border-card)',
                  backgroundColor: selectedComboId === combo.id ? '#FAF5FD' : '#FFFFFF'
                }}
              >
                <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                  {combo.image && (
                    <img
                      src={combo.image}
                      alt={combo.name}
                      style={{ width: '55px', height: '55px', objectFit: 'cover', borderRadius: 'var(--radius-md)', flexShrink: 0, border: '1px solid var(--color-border-card)' }}
                    />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <h4 style={{ color: 'var(--color-brand-purple)', fontSize: '1.02rem', fontWeight: 700, margin: 0 }}>
                        {combo.name}
                      </h4>
                      <span style={{ fontWeight: 800, color: 'var(--color-brand-purple)', fontSize: '1.05rem' }}>
                        ₹{combo.price}
                      </span>
                    </div>
                  </div>
                </div>


                <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', marginBottom: '0.65rem' }}>
                  {combo.description}
                </p>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.85rem' }}>
                  {combo.includes.map((item, i) => (
                    <span key={i} className="combo-item-chip" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Check size={12} strokeWidth={2.5} color="#592F7C" />
                      <span>{item}</span>
                    </span>
                  ))}
                </div>

                <button
                  type="button"
                  className={selectedComboId === combo.id ? 'btn btn-purple' : 'btn btn-secondary'}
                  style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}
                  onClick={() => {
                    onSelectCombo(combo.id);
                    onClose();
                  }}
                >
                  {selectedComboId === combo.id ? 'Selected' : 'Choose This Combo'}
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="modal-footer" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          {menuPdfUrl && (
            <a
              href={menuPdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', color: 'var(--color-brand-purple)', fontWeight: 600, textDecoration: 'none' }}
            >
              <span>Visit Zelebrae Pastries Online</span>
              <ExternalLink size={14} />
            </a>
          )}
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
