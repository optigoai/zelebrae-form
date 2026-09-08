import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Sparkles, Check, ExternalLink, ZoomIn, X } from 'lucide-react';
import { Amenity, ComboItem } from '../types/booking';
import { AmenityIcon } from './CelebrationIcon';

const COMBO_MENU_DRIVE_URL = 'https://drive.google.com/file/d/1utY7FdUORh4c7TjVr1a4vAy8Qhg6eY3l/view?usp=drivesdk';

interface StepCustomizeProps {
  occasion?: string;
  amenities: Amenity[];
  selectedAmenities: string[];
  onToggleAmenity: (id: string) => void;
  combos: ComboItem[];
  selectedCombo: string;
  selectedPackage?: string;
  selectedPrice?: number;
  onSelectCombo: (id: string, defaultPackageCode?: string, defaultPrice?: number) => void;
  onSelectPackage: (pkgCode: string, price: number) => void;
  menuPdfUrl?: string;
}

interface PreviewModalData {
  url: string;
  title: string;
  price?: number;
  driveUrl?: string;
}

const getCombosForOccasion = (combos: ComboItem[], occasion?: string): ComboItem[] => {
  // Exclude 'none' option completely
  const activeCombos = combos.filter(c => c.id !== 'none');

  if (!occasion || occasion === 'other') {
    return activeCombos;
  }

  const filtered = activeCombos.filter(combo => {
    const normOcc = occasion.toLowerCase().trim();
    const normId = combo.id.toLowerCase().trim();
    const normCat = (combo.category || '').toLowerCase().trim();
    const normName = (combo.name || '').toLowerCase().trim();

    if (normOcc === 'birthday') {
      return normId.includes('birthday') || normCat.includes('birthday') || normName.includes('birthday');
    }
    if (normOcc === 'anniversary') {
      return normId.includes('anniversary') || normCat.includes('anniversary') || normName.includes('anniversary');
    }
    if (normOcc === 'bride_to_be') {
      return normId.includes('bride') || normCat.includes('bride') || normName.includes('bride');
    }
    if (normOcc === 'groom_to_be') {
      return normId.includes('groom') || normCat.includes('groom') || normName.includes('groom');
    }
    if (normOcc === 'mom_to_be') {
      return normId.includes('mom') || normCat.includes('mom') || normName.includes('mom');
    }

    return true;
  });

  return filtered.length > 0 ? filtered : activeCombos;
};

export const StepCustomize: React.FC<StepCustomizeProps> = ({
  occasion,
  amenities,
  selectedAmenities,
  onToggleAmenity,
  combos,
  selectedCombo,
  selectedPackage,
  selectedPrice: _selectedPrice,
  onSelectCombo,
  onSelectPackage,
  menuPdfUrl = COMBO_MENU_DRIVE_URL
}) => {
  const driveUrl = menuPdfUrl || COMBO_MENU_DRIVE_URL;
  const [previewImage, setPreviewImage] = useState<PreviewModalData | null>(null);

  const filteredCombos = React.useMemo(() => {
    return getCombosForOccasion(combos, occasion);
  }, [combos, occasion]);

  // If the currently selected combo isn't in the filtered list (or is 'none'), safely auto-select the first available combo
  React.useEffect(() => {
    if (filteredCombos.length > 0 && (!selectedCombo || selectedCombo === 'none' || !filteredCombos.some(c => c.id === selectedCombo))) {
      const first = filteredCombos[0];
      const firstOpt = first.options && first.options.length > 0 ? first.options[0] : undefined;
      onSelectCombo(first.id, firstOpt?.code, firstOpt?.price ?? first.price);
    }
  }, [filteredCombos, selectedCombo, onSelectCombo]);

  // Lock body scroll when preview lightbox is open
  React.useEffect(() => {
    if (previewImage) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [previewImage]);


  return (
    <div className="animate-fade-in customization-section">
      <div className="step-header">
        <span className="step-tag">
          <Sparkles size={14} />
          Step 4 of 5
        </span>
        <h1 className="step-title">Party Accessories & Combos</h1>
      </div>

      {/* ===================================================================
          Section 1: Horizontal Scrolling Combo Cards (Image & Rate Only)
          =================================================================== */}
      <div className="combos-section-wrap">
        {filteredCombos.map((combo) => {
          const isSelected = selectedCombo === combo.id;
          const currentPkgCode = isSelected ? (selectedPackage || combo.options?.[0]?.code) : combo.options?.[0]?.code;
          const comboDriveUrl = combo.driveUrl || driveUrl;

          return (
            <div key={combo.id} className="combo-theme-block">
              <div className="combo-theme-header">
                <h2 className="combo-theme-title">{combo.name}</h2>
                {comboDriveUrl && (
                  <a
                    href={comboDriveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="combo-view-menu-btn"
                    onClick={(e) => e.stopPropagation()}
                    title={`Open full ${combo.name} PDF in Google Drive`}
                  >
                    <span>View Combo</span>
                    <ExternalLink size={12} />
                  </a>
                )}
              </div>

              {/* Combo Visual Cards Grid: Image + Rate Only */}
              <div className="combo-cards-grid" role="radiogroup" aria-label={combo.name}>
                {combo.options && combo.options.length > 0 ? (
                  combo.options.map((opt) => {
                    const isOptActive = isSelected && currentPkgCode === opt.code;
                    const optImage = opt.image || combo.image || '/images/combos/birthday/cover.jpeg';

                    return (
                      <div
                        key={opt.code}
                        className={`combo-theme-card ${isOptActive ? 'selected' : ''}`}
                        onClick={() => {
                          onSelectCombo(combo.id, opt.code, opt.price);
                          onSelectPackage(opt.code, opt.price);
                        }}
                        role="radio"
                        aria-checked={isOptActive}
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            onSelectCombo(combo.id, opt.code, opt.price);
                            onSelectPackage(opt.code, opt.price);
                          }
                        }}
                      >
                        {isOptActive && (
                          <div className="combo-theme-card-badge">
                            <Check size={12} strokeWidth={3} />
                          </div>
                        )}

                        <div className="combo-theme-card-media">
                          <img
                            src={optImage}
                            alt={opt.code}
                            className="combo-theme-card-img"
                            loading="lazy"
                          />
                          <button
                            type="button"
                            className="combo-theme-zoom-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPreviewImage({
                                url: optImage,
                                title: `${opt.code} (₹${opt.price})`,
                                price: opt.price,
                                driveUrl: comboDriveUrl
                              });
                            }}
                            aria-label={`Zoom ${opt.code}`}
                            title="Tap to zoom"
                          >
                            <ZoomIn size={13} />
                          </button>
                        </div>

                        <div className="combo-theme-card-info">
                          <span className="combo-theme-code">{opt.code}</span>
                          <span className="combo-theme-rate">₹{opt.price}</span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div
                    className={`combo-theme-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => onSelectCombo(combo.id, undefined, combo.price)}
                    role="radio"
                    aria-checked={isSelected}
                    tabIndex={0}
                  >
                    {isSelected && (
                      <div className="combo-theme-card-badge">
                        <Check size={12} strokeWidth={3} />
                      </div>
                    )}
                    <div className="combo-theme-card-media">
                      <img
                        src={combo.image}
                        alt={combo.name}
                        className="combo-theme-card-img"
                        loading="lazy"
                      />
                    </div>
                    <div className="combo-theme-card-info">
                      <span className="combo-theme-code">{combo.name}</span>
                      <span className="combo-theme-rate">₹{combo.price}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ===================================================================
          Section 2: Included Amenities (Compact & Cohesive Perks Card)
          =================================================================== */}
      <div className="amenities-perks-container">
        <div className="amenities-perks-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span className="amenities-perks-title">Complimentary With Your Booking:</span>
          </div>
        </div>

        <div className="amenities-perks-grid">
          {amenities.map((amenity) => {
            const isSelected = selectedAmenities.includes(amenity.id);

            return (
              <button
                key={amenity.id}
                type="button"
                className={`amenity-perk-chip ${isSelected ? 'selected' : ''}`}
                onClick={() => onToggleAmenity(amenity.id)}
                role="checkbox"
                aria-checked={isSelected}
                title={`Click to toggle ${amenity.name}`}
              >
                <div className="amenity-perk-icon" aria-hidden="true">
                  <AmenityIcon iconName={amenity.icon} size={13} />
                </div>

                <span className="amenity-perk-name">{amenity.name}</span>

                <div className="amenity-perk-check">
                  {isSelected && <Check size={10} strokeWidth={3} />}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Lightbox / Full Photo Preview Modal */}
      {/* Lightbox Zoom for Combo Photo (Rendered into document.body to avoid parent transform traps) */}
      {previewImage && createPortal(
        <div className="combo-preview-overlay" onClick={() => setPreviewImage(null)} role="dialog" aria-modal="true" aria-label={previewImage.title}>
          <div className="combo-preview-card" onClick={(e) => e.stopPropagation()}>
            <div className="combo-preview-header">
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <h3 className="combo-preview-title">{previewImage.title}</h3>
                {previewImage.price !== undefined && (
                  <span className="combo-preview-price">₹{previewImage.price}</span>
                )}
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setPreviewImage(null)}
                aria-label="Close photo preview"
              >
                <X size={20} />
              </button>
            </div>

            <div className="combo-preview-img-container">
              <img
                src={previewImage.url}
                alt={previewImage.title}
                className="combo-preview-img"
              />
            </div>

            <div className="combo-preview-footer">
              {previewImage.driveUrl && (
                <a
                  href={previewImage.driveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary"
                  style={{ fontSize: '0.82rem', padding: '0.45rem 0.9rem', gap: '0.4rem' }}
                >
                  <span>Open Combo Details</span>
                  <ExternalLink size={13} />
                </a>
              )}
              <button
                type="button"
                className="btn btn-cta"
                style={{ fontSize: '0.82rem', padding: '0.45rem 1.15rem' }}
                onClick={() => setPreviewImage(null)}
              >
                Got It
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
