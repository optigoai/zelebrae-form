import React from 'react';
import { MapPin, Check } from 'lucide-react';
import { CelebrationLocation } from '../types/booking';

interface StepLocationProps {
  locations: CelebrationLocation[];
  selectedLocationId: string;
  onSelectLocation: (id: string) => void;
  onContinue: () => void;
}

export const StepLocation: React.FC<StepLocationProps> = ({
  locations,
  selectedLocationId,
  onSelectLocation
}) => {
  const selectedLocation = locations.find(l => l.id === selectedLocationId) || locations[0];

  return (
    <div className="animate-fade-in">
      {/* Step Header */}
      <div className="step-header">
        <span className="step-tag">
          Welcome to Zelebrae
        </span>
        <h1 className="step-title">Reserve Your Sweet Moment</h1>

      </div>

      {/* Hero Showcase Image (Clean Image, No Words) */}
      <div className="hero-showcase-card">
        <div className="hero-showcase-media">
          <img
            src="/hero.webp"
            alt="Zelebrae Celebration Point"
            className="hero-showcase-img"
            loading="eager"
          />
        </div>
      </div>

      {/* Location Selector (Just Location Names) */}
      <div className="location-selection-section">
        <div className="location-section-header">
          <h3 style={{ fontSize: '1.05rem', color: 'var(--color-brand-purple)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.2rem' }}>
            <MapPin size={17} color="#4A1E5F" />
            Select Celebration Location
          </h3>
        </div>

        {/* 4 Location Cards with Clean Names Only */}
        <div className="location-names-grid" role="radiogroup" aria-label="Select Celebration Location">
          {locations.map((loc) => {
            const isSelected = selectedLocationId === loc.id;
            const shortName = loc.name.replace(' Celebration Point', '').trim();

            return (
              <div
                key={loc.id}
                className={`location-name-card ${isSelected ? 'selected' : ''}`}
                onClick={() => onSelectLocation(loc.id)}
                role="radio"
                aria-checked={isSelected}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectLocation(loc.id);
                  }
                }}
              >
                <div className="location-card-top">
                  <div className="location-pin-wrap">
                    <MapPin size={16} />
                  </div>
                  {isSelected ? (
                    <span className="location-selected-pill">
                      <Check size={11} strokeWidth={3} />
                      Selected
                    </span>
                  ) : (
                    <span className="location-select-dot" />
                  )}
                </div>

                <div className="location-card-info">
                  <h4 className="location-single-name">{shortName}</h4>
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Branch Address Info */}
        {selectedLocation && (
          <div className="selected-location-details animate-fade-in">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <MapPin size={18} color="#4A1E5F" style={{ flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--color-brand-purple)' }}>
                  {selectedLocation.name.replace(' Celebration Point', '')}
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                  {selectedLocation.address}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
