import React from 'react';
import { Sparkles, Gift, Check, ExternalLink, ChevronDown } from 'lucide-react';
import { Amenity, ComboItem } from '../types/booking';
import { AmenityIcon } from './CelebrationIcon';

const COMBO_MENU_DRIVE_URL = 'https://drive.google.com/file/d/1utY7FdUORh4c7TjVr1a4vAy8Qhg6eY3l/view?usp=drivesdk';

interface StepCustomizeProps {
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

export const StepCustomize: React.FC<StepCustomizeProps> = ({
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

  return (
    <div className="animate-fade-in customization-section">
      <div className="step-header">
        <span className="step-tag">
          <Sparkles size={14} />
          Step 4 of 5
        </span>
        <h1 className="step-title">Included Amenities</h1>
      </div>

      {/* Section 1: Included Amenities */}
      <div>

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
                  <AmenityIcon iconName={amenity.icon} size={20} />
                </div>

                <div className="amenity-content">
                  <div className="amenity-title-row">
                    <span className="amenity-title">{amenity.name}</span>
                  </div>
                </div>

                <div className="custom-checkbox">
                  {isSelected && <Check size={14} strokeWidth={3} />}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section 2: Combos & Party Accessories */}
      <div>
        <div className="section-block-title">
          <div>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Gift size={20} color="#592F7C" />
              Party Accessories & Combos
            </h3>
          </div>

          <a
            href={driveUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-ghost"
            style={{
              fontSize: '0.82rem',
              padding: '0.35rem 0.65rem',
              color: 'var(--color-brand-purple)',
              fontWeight: 700,
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}
            title="Open Zelebrae Combo Menu in Google Drive"
          >
          </a>
        </div>

        <div className="combos-list" role="radiogroup" aria-label="Party Combos">
          {combos.map((combo) => {
            const isSelected = selectedCombo === combo.id;
            const currentPrice = isSelected && selectedPrice !== undefined ? selectedPrice : combo.price;
            const comboDriveUrl = combo.driveUrl || driveUrl;

            return (
              <div
                key={combo.id}
                className={`combo-card ${isSelected ? 'selected' : ''}`}
                onClick={() => {
                  const firstOpt = combo.options && combo.options.length > 0 ? combo.options[0] : undefined;
                  onSelectCombo(combo.id, firstOpt?.code, firstOpt?.price ?? combo.price);
                }}
                role="radio"
                aria-checked={isSelected}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    const firstOpt = combo.options && combo.options.length > 0 ? combo.options[0] : undefined;
                    onSelectCombo(combo.id, firstOpt?.code, firstOpt?.price ?? combo.price);
                  }
                }}
              >
                {combo.popular && (
                  <span className="combo-popular-badge">
                    Most Popular
                  </span>
                )}

                <div className="combo-header">
                  <div className="combo-title-area">
                    <div className="radio-circle">
                      {isSelected && <div className="radio-inner-dot" />}
                    </div>
                    <span className="combo-name">{combo.name}</span>
                  </div>

                  <div className="combo-actions-area">
                    {combo.id !== 'none' && comboDriveUrl && (
                      <a
                        href={comboDriveUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="combo-view-menu-btn"
                        onClick={(e) => e.stopPropagation()}
                        title={`Open ${combo.name} in Google Drive`}
                      >
                        <span>View Menu</span>
                        <ExternalLink size={12} />
                      </a>
                    )}

                    {combo.price === 0 ? (
                      <span className="combo-free">Included</span>
                    ) : (
                      <span className="combo-price">₹{currentPrice}</span>
                    )}
                  </div>
                </div>

                <p className="combo-desc">{combo.description}</p>

                {/* Dropdown for variant / price selection when combo is selected */}
                {isSelected && combo.options && combo.options.length > 0 && (
                  <div
                    className="combo-dropdown-wrapper"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <label htmlFor={`combo-select-${combo.id}`} className="combo-select-label">
                      <span className="required-star">*</span> Select {combo.name}
                    </label>
                    <div className="combo-select-field">
                      <select
                        id={`combo-select-${combo.id}`}
                        className="combo-select-input"
                        value={selectedPackage || combo.options[0]?.code}
                        onChange={(e) => {
                          const chosen = combo.options?.find(o => o.code === e.target.value);
                          if (chosen) {
                            onSelectPackage(chosen.code, chosen.price);
                          }
                        }}
                      >
                        {combo.options.map((opt) => (
                          <option key={opt.code} value={opt.code}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      <div className="combo-select-chevron">
                        <ChevronDown size={18} />
                      </div>
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
            );
          })}
        </div>
      </div>
    </div>
  );
};
