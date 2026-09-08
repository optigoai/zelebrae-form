import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Sparkles, Gift, Check, ExternalLink, ZoomIn, X } from 'lucide-react';
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
  selectedPrice,
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
          Section 1: Party Accessories & Combos (At Top for Zero-Scroll)
          =================================================================== */}
      <div className="combos-section-wrap">
        <div className="section-block-title" style={{ marginBottom: '0.45rem' }}>
          <div>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '1.05rem' }}>
              <Gift size={16} color="#592F7C" />
              Party Accessories & Combos
            </h3>
          </div>
        </div>

        <div className="combos-list" role="radiogroup" aria-label="Party Combos">
          {filteredCombos.map((combo) => {
            const isSelected = selectedCombo === combo.id;
            const currentPkgCode = isSelected ? (selectedPackage || combo.options?.[0]?.code) : combo.options?.[0]?.code;
            const currentOption = combo.options?.find(o => o.code === currentPkgCode) || combo.options?.[0];
            const currentPrice = isSelected && selectedPrice !== undefined ? selectedPrice : (currentOption?.price ?? combo.price);
            const comboDriveUrl = combo.driveUrl || driveUrl;

            // Determine image to display on the side of the combo option
            const currentImage = currentOption?.image || combo.image || '/images/combos/birthday/cover.jpeg';

            return (
              <div
                key={combo.id}
                className={`combo-card ${isSelected ? 'selected' : ''}`}
                onClick={() => {
                  const firstOpt = combo.options && combo.options.length > 0 ? combo.options[0] : undefined;
                  onSelectCombo(combo.id, currentPkgCode || firstOpt?.code, currentPrice || firstOpt?.price || combo.price);
                }}
                role="radio"
                aria-checked={isSelected}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    const firstOpt = combo.options && combo.options.length > 0 ? combo.options[0] : undefined;
                    onSelectCombo(combo.id, currentPkgCode || firstOpt?.code, currentPrice || firstOpt?.price || combo.price);
                  }
                }}
              >
                {combo.popular && (
                  <span className="combo-popular-badge">
                    Most Popular
                  </span>
                )}

                <div className="combo-card-layout">
                  {/* Top Row: Side Image Preview & Details */}
                  <div className="combo-card-top">
                    {/* Side Image Preview Thumbnail */}
                    <div
                      className="combo-side-image-wrapper"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewImage({
                          url: currentImage,
                          title: `${combo.name} (${currentPkgCode || 'Cover'})`,
                          price: currentPrice,
                          driveUrl: comboDriveUrl
                        });
                      }}
                      role="button"
                      tabIndex={0}
                      aria-label={`View photo for ${combo.name} ${currentPkgCode || ''}`}
                      title="Click to view full photo setup"
                    >
                      <img
                        src={currentImage}
                        alt={`${combo.name} ${currentPkgCode || ''}`}
                        className="combo-side-image"
                        loading="lazy"
                      />
                      <div className="combo-image-zoom-badge">
                        <ZoomIn size={12} />
                        <span>View</span>
                      </div>
                    </div>

                    {/* Details Section */}
                    <div className="combo-details-area">
                      <div className="combo-header">
                        <div className="combo-title-area">
                          <div className="radio-circle">
                            {isSelected && <div className="radio-inner-dot" />}
                          </div>
                          <span className="combo-name">{combo.name}</span>
                        </div>

                        <div className="combo-actions-area">
                          {comboDriveUrl && (
                            <a
                              href={comboDriveUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="combo-view-menu-btn"
                              onClick={(e) => e.stopPropagation()}
                              title={`Open full ${combo.name} PDF menu in Google Drive`}
                            >
                              <span>View Menu</span>
                              <ExternalLink size={12} />
                            </a>
                          )}

                          <span className="combo-price">₹{currentPrice}</span>
                        </div>
                      </div>

                      <p className="combo-desc">{combo.description}</p>
                    </div>
                  </div>

                  {/* Package Variant Pills Grid (Spanning FULL WIDTH under image and details) */}
                  {combo.options && combo.options.length > 0 && (
                    <div className="combo-variants-wrapper" onClick={(e) => e.stopPropagation()}>
                      <div className="combo-variants-header">
                        <span className="combo-variants-title">
                          <span className="required-star">*</span> Select Package Variant:
                        </span>
                      </div>
                      <div className="combo-variants-pills-grid">
                        {combo.options.map((opt) => {
                          const isOptActive = isSelected && currentPkgCode === opt.code;
                          return (
                            <button
                              key={opt.code}
                              type="button"
                              className={`combo-variant-pill ${isOptActive ? 'active' : ''}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectCombo(combo.id, opt.code, opt.price);
                                onSelectPackage(opt.code, opt.price);
                              }}
                              title={`Select ${opt.label || `${opt.code} ₹${opt.price}`}`}
                            >
                              {opt.image && (
                                <img
                                  src={opt.image}
                                  alt={opt.code}
                                  className="combo-variant-mini-thumb"
                                  loading="lazy"
                                />
                              )}
                              <span className="combo-variant-code">{opt.code}</span>
                              <span className="combo-variant-price">₹{opt.price}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {combo.includes && combo.includes.length > 0 && (
                    <div className="combo-items-pills">
                      {combo.includes.map((item, idx) => (
                        <span key={idx} className="combo-item-chip" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                          <Check size={12} strokeWidth={2.5} color="#592F7C" />
                          <span>{item}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ===================================================================
          Section 2: Included Amenities (Compact 2-Column at Bottom)
          =================================================================== */}
      <div className="amenities-section-wrap" style={{ marginTop: '0.4rem' }}>
        <div className="section-block-title" style={{ marginBottom: '0.45rem' }}>
          <div>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '1.05rem' }}>
              <Sparkles size={16} color="#592F7C" />
              Included Amenities
              <span className="complimentary-pill" style={{ marginLeft: '0.35rem' }}>Complimentary</span>
            </h3>
          </div>
        </div>

        <div className="amenities-list">
          {amenities.map((amenity) => {
            const isSelected = selectedAmenities.includes(amenity.id);

            return (
              <div
                key={amenity.id}
                className={`amenity-card ${isSelected ? 'selected' : ''}`}
                onClick={() => onToggleAmenity(amenity.id)}
                role="checkbox"
                aria-checked={isSelected}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onToggleAmenity(amenity.id);
                  }
                }}
              >
                <div className="amenity-icon" aria-hidden="true">
                  <AmenityIcon iconName={amenity.icon} size={17} />
                </div>

                <div className="amenity-content">
                  <div className="amenity-title-row">
                    <span className="amenity-title">{amenity.name}</span>
                  </div>
                </div>

                <div className="custom-checkbox">
                  {isSelected && <Check size={13} strokeWidth={3} />}
                </div>
              </div>
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
