import React from 'react';
import { Minus, Plus, Users, Check, Sparkles } from 'lucide-react';
import { Occasion } from '../types/booking';
import { OccasionIcon } from './CelebrationIcon';

interface StepOccasionGuestsProps {
  occasions: Occasion[];
  selectedOccasion: string;
  customOccasion?: string;
  onSelectOccasion: (id: string) => void;
  onChangeCustomOccasion: (val: string) => void;
  guests: number;
  minGuests: number;
  maxGuests: number;
  onChangeGuests: (num: number) => void;
}

export const StepOccasionGuests: React.FC<StepOccasionGuestsProps> = ({
  occasions,
  selectedOccasion,
  customOccasion,
  onSelectOccasion,
  onChangeCustomOccasion,
  guests,
  minGuests,
  maxGuests,
  onChangeGuests
}) => {
  const presetGuests = [2, 4, 6, 10, 15];

  const handleDecrement = () => {
    if (guests > minGuests) {
      onChangeGuests(guests - 1);
    }
  };

  const handleIncrement = () => {
    if (guests < maxGuests) {
      onChangeGuests(guests + 1);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="step-header">
        <span className="step-tag">
          <Sparkles size={14} />
          Step 2 of 5
        </span>
        <h1 className="step-title">What are you celebrating?</h1>

      </div>

      {/* Occasion Cards */}
      <div className="occasions-grid" role="radiogroup" aria-label="Select Occasion">
        {occasions.map((occ) => {
          const isSelected = selectedOccasion === occ.id;

          return (
            <div
              key={occ.id}
              className={`occasion-card ${isSelected ? 'selected' : ''}`}
              onClick={() => onSelectOccasion(occ.id)}
              role="radio"
              aria-checked={isSelected}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectOccasion(occ.id);
                }
              }}
            >
              {isSelected && (
                <div className="occasion-selected-check">
                  <Check size={12} strokeWidth={3} />
                </div>
              )}
              <div className="occasion-icon-wrap" aria-hidden="true">
                <OccasionIcon iconName={occ.icon} size={22} />
              </div>
              <div className="occasion-title">{occ.name}</div>
            </div>
          );
        })}
      </div>

      {/* Custom Occasion Text input if 'other' is chosen */}
      {selectedOccasion === 'other' && (
        <div className="custom-occasion-box animate-scale-in">
          <label
            htmlFor="customOccasionInput"
            style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-brand-purple)', marginBottom: '0.4rem' }}
          >
            Please specify your celebration:
          </label>
          <input
            id="customOccasionInput"
            type="text"
            className="input-field"
            placeholder="e.g. Farewell, Graduation, Promotion..."
            value={customOccasion || ''}
            onChange={(e) => onChangeCustomOccasion(e.target.value)}
            autoFocus
          />
        </div>
      )}

      {/* Guest Count Section */}
      <div className="guest-section">
        <div className="guest-header">
          <div className="guest-title-wrap">
            <h4>How many guests?</h4>
          </div>
          <span className="badge badge-purple">
            <Users size={12} />
            Max {maxGuests}
          </span>
        </div>

        <div className="guest-stepper-row">
          <button
            type="button"
            className="stepper-btn"
            onClick={handleDecrement}
            disabled={guests <= minGuests}
            aria-label="Decrease guests"
          >
            <Minus size={20} />
          </button>

          <div className="guest-count-display">
            <span className="guest-number">{guests}</span>
            <span className="guest-unit">{guests === 1 ? 'Guest' : 'Guests'}</span>
          </div>

          <button
            type="button"
            className="stepper-btn"
            onClick={handleIncrement}
            disabled={guests >= maxGuests}
            aria-label="Increase guests"
          >
            <Plus size={20} />
          </button>
        </div>

        {/* Quick Presets */}
        <div className="guest-presets" aria-label="Guest count presets">
          {presetGuests.map((preset) => (
            <button
              key={preset}
              type="button"
              className={`preset-chip ${guests === preset ? 'active' : ''}`}
              onClick={() => onChangeGuests(preset)}
              aria-label={`${preset} guests`}
            >
              {preset}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
