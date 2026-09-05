import React from 'react';
import { Sparkles, MapPin, CheckCircle2, ShieldCheck, Check } from 'lucide-react';
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
          <Sparkles size={14} />
          Welcome to Zelebrae
        </span>
        <h1 className="step-title">Reserve Your Sweet Moment</h1>
        <p className="step-subtitle">
          Enjoy our complimentary private celebration lounge with every cake pre-order.
        </p>
      </div>

      {/* Hero Showcase Image (Shown Once) */}
      <div className="hero-showcase-card">
        <div className="hero-showcase-media">
          <img 
            src="/hero.webp" 
            alt="Zelebrae Celebration Point" 
            className="hero-showcase-img"
            loading="eager"
          />
          <div className="location-badge-overlay">
            <Sparkles size={14} color="#FDE68A" />
            <span>Complimentary Celebration Space</span>
          </div>
        </div>

        <div className="hero-showcase-features">
          <div className="hero-feature-item">
            <CheckCircle2 size={15} color="#1B8755" />
            <span>Floral Backdrop & Neon Sign</span>
          </div>
          <div className="hero-feature-item">
            <CheckCircle2 size={15} color="#1B8755" />
            <span>Private AC Celebration Nook</span>
          </div>
          <div className="hero-feature-item">
            <CheckCircle2 size={15} color="#1B8755" />
            <span>Sound System & Wireless Mic</span>
          </div>
          <div className="hero-feature-item">
            <ShieldCheck size={15} color="#1B8755" />
            <span>1-Hr Slot with Cake Pre-Order</span>
          </div>
        </div>
      </div>

      {/* Location Selector (Just Location Names) */}
      <div className="location-selection-section">
        <div className="location-section-header">
          <h3 style={{ fontSize: '1.05rem', color: 'var(--color-brand-purple)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.2rem' }}>
            <MapPin size={17} color="#4A1E5F" />
            Select Celebration Location
          </h3>
          <p style={{ fontSize: '0.84rem', color: 'var(--color-text-muted)' }}>
            Choose which Zelebrae branch you would like to book for your special moment.
          </p>
        </div>

        {/* 4 Location Cards with Clean Names */}
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
                  <p className="location-single-subtext">{loc.tagline || 'Celebration Point'}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Branch Address Info */}
        {selectedLocation && (
          <div className="selected-location-details animate-fade-in">
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem' }}>
              <MapPin size={18} color="#4A1E5F" style={{ marginTop: '2px', flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--color-brand-purple)' }}>
                  {selectedLocation.name}
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                  {selectedLocation.address}
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)', marginTop: '4px', fontWeight: 600 }}>
                  Capacity: Up to {selectedLocation.maxCapacity} Guests • Private 1-Hour Slot
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
