import React, { useState } from 'react';
import { 
  Sparkles, 
  MapPin, 
  Calendar, 
  Clock, 
  Users, 
  Gift, 
  User, 
  Phone, 
  FileText, 
  Edit3,
  X
} from 'lucide-react';
import { BookingState, CelebrationLocation, Occasion, Amenity, ComboItem } from '../types/booking';
import { formatCelebrationDate, formatTimeSlotRange } from '../utils/dateUtils';
import { OccasionIcon, AmenityIcon } from './CelebrationIcon';
import { GuidelinesModal } from './GuidelinesModal';

interface StepReviewProps {
  state: BookingState;
  locations: CelebrationLocation[];
  occasions: Occasion[];
  amenities: Amenity[];
  combos: ComboItem[];
  onEditStep: (stepNumber: number) => void;
  onToggleGuidelines: (agreed: boolean) => void;
}

export const StepReview: React.FC<StepReviewProps> = ({
  state,
  locations,
  occasions,
  amenities,
  combos,
  onEditStep,
  onToggleGuidelines
}) => {
  const [isGuidelinesOpen, setIsGuidelinesOpen] = useState(false);
  const [isReceiptZoomOpen, setIsReceiptZoomOpen] = useState(false);

  const currentLocation = locations.find(l => l.id === state.location);
  const currentOccasion = occasions.find(o => o.id === state.occasion);
  const occasionDisplayName = state.occasion === 'other' && state.customOccasion 
    ? state.customOccasion 
    : (currentOccasion?.name || state.occasion);

  const selectedAmenityObjects = amenities.filter(a => state.amenities.includes(a.id));
  const currentCombo = combos.find(c => c.id === state.combo);

  return (
    <div className="animate-fade-in">
      <div className="step-header">
        <span className="step-tag">
          <Sparkles size={14} />
          Final Review
        </span>
        <h1 className="step-title">Review Your Reservation</h1>
        <p className="step-subtitle">
          Please review your celebration details before confirming your booking.
        </p>
      </div>

      {/* Luxury Celebration Receipt Card */}
      <div className="review-card">
        <div className="review-header">
          <div>
            <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.85 }}>
              Reservation Summary
            </span>
            <h3>{occasionDisplayName} Celebration</h3>
          </div>
          <span className="review-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
            <OccasionIcon iconName={currentOccasion?.icon} size={15} color="#FFFFFF" />
            <span>{occasionDisplayName}</span>
          </span>
        </div>

        <div className="review-body">
          {/* Section 1: Place, Date & Slot */}
          <div className="review-section">
            <div className="review-info-group">
              <span className="review-label">Location</span>
              <span className="review-value-highlight">
                {currentLocation?.name || 'Ashokapuram Celebration Point'}
              </span>
              <span className="review-subtext" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <MapPin size={13} color="#6B7280" />
                {currentLocation?.address || 'Ashokapuram, Kozhikode'}
              </span>
            </div>
            <button
              type="button"
              className="edit-btn"
              onClick={() => onEditStep(1)}
              aria-label="Edit location"
            >
              <Edit3 size={13} /> Edit
            </button>
          </div>

          {/* Section 2: Date, Slot & Guests */}
          <div className="review-section">
            <div className="review-info-group">
              <span className="review-label">Date & Time Slot</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.2rem' }}>
                <span className="review-value" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Calendar size={15} color="#592F7C" />
                  {formatCelebrationDate(state.date)}
                </span>
                <span className="review-value" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#592F7C' }}>
                  <Clock size={15} color="#592F7C" />
                  {formatTimeSlotRange(state.timeSlot)}
                </span>
                <span className="review-subtext" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.15rem' }}>
                  <Users size={14} color="#6B7280" />
                  {state.guests} {state.guests === 1 ? 'Guest' : 'Guests'} (Private space)
                </span>
              </div>
            </div>
            <button
              type="button"
              className="edit-btn"
              onClick={() => onEditStep(3)}
              aria-label="Edit date and time"
            >
              <Edit3 size={13} /> Edit
            </button>
          </div>

          {/* Section 3: Amenities & Combos */}
          <div className="review-section">
            <div className="review-info-group">
              <span className="review-label">Add-ons & Celebration Combo</span>
              <div style={{ marginTop: '0.3rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                {currentCombo && currentCombo.id !== 'none' ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    {(currentCombo.options?.find(o => o.code === state.comboPackage)?.image || currentCombo.image) && (
                      <img
                        src={currentCombo.options?.find(o => o.code === state.comboPackage)?.image || currentCombo.image}
                        alt={currentCombo.name}
                        style={{ width: '42px', height: '42px', objectFit: 'cover', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border-card)', flexShrink: 0 }}
                      />
                    )}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                        <Gift size={14} color="#D97706" />
                        <span style={{ fontWeight: 700, color: 'var(--color-brand-purple)', fontSize: '0.92rem' }}>
                          {currentCombo.name}
                          {state.comboPackage ? ` — ${state.comboPackage}` : ''}
                        </span>
                      </div>
                      <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                        +₹{state.comboPrice || currentCombo.price}
                      </span>
                    </div>
                  </div>
                ) : (
                  <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                    No Party Combo selected
                  </span>
                )}


                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.2rem' }}>
                  {selectedAmenityObjects.map((a) => (
                    <span key={a.id} className="badge badge-purple" style={{ fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                      <AmenityIcon iconName={a.icon} size={12} />
                      <span>{a.name}</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <button
              type="button"
              className="edit-btn"
              onClick={() => onEditStep(4)}
              aria-label="Edit amenities and combos"
            >
              <Edit3 size={13} /> Edit
            </button>
          </div>

          {/* Section 4: Customer Details */}
          <div className="review-section">
            <div className="review-info-group">
              <span className="review-label">Customer Contact</span>
              <div style={{ marginTop: '0.25rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                <span className="review-value" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <User size={14} color="#592F7C" />
                  {state.name}
                </span>
                <span className="review-subtext" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Phone size={13} color="#592F7C" />
                  {state.countryCode} {state.whatsapp}
                </span>
                {state.additionalRequirements && (
                  <span className="review-subtext" style={{ fontStyle: 'italic', marginTop: '0.2rem' }}>
                    “{state.additionalRequirements}”
                  </span>
                )}
              </div>
            </div>
            <button
              type="button"
              className="edit-btn"
              onClick={() => onEditStep(5)}
              aria-label="Edit customer details"
            >
              <Edit3 size={13} /> Edit
            </button>
          </div>

          {/* Section 5: Advance Payment Deposit */}
          <div className="review-section">
            <div className="review-info-group">
              <span className="review-label">Advance Confirmation Deposit</span>
              <div style={{ marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {state.paymentScreenshot && (
                  <img
                    src={state.paymentScreenshot}
                    alt="Payment Screenshot"
                    style={{
                      width: '44px',
                      height: '44px',
                      objectFit: 'cover',
                      borderRadius: 'var(--radius-md)',
                      border: '1.5px solid var(--color-border-card)',
                      cursor: 'pointer',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.08)'
                    }}
                    onClick={() => setIsReceiptZoomOpen(true)}
                    title="Click to view payment receipt"
                  />
                )}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{ fontWeight: 800, color: '#059669', fontSize: '0.98rem' }}>
                      ₹500 Paid
                    </span>
                    <span className="badge badge-rose" style={{ fontSize: '0.68rem', padding: '0.15rem 0.45rem' }}>
                      Advance Deposit
                    </span>
                  </div>
                  <span className="review-subtext" style={{ display: 'block', marginTop: '0.1rem' }}>
                    Deducted from final venue bill · Receipt proof attached
                  </span>
                </div>
              </div>
            </div>
            <button
              type="button"
              className="edit-btn"
              onClick={() => onEditStep(5)}
              aria-label="Edit payment proof"
            >
              <Edit3 size={13} /> Edit
            </button>
          </div>
        </div>
      </div>

      {/* Guidelines Agreement Box */}
      <div className="guidelines-agreement-card">
        <div className="guidelines-prompt-row">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileText size={18} color="#592F7C" />
            <span style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--color-brand-purple)' }}>
              Celebration Area Guidelines
            </span>
          </div>
          <button
            type="button"
            className="guidelines-view-btn"
            onClick={() => setIsGuidelinesOpen(true)}
          >
            View Guidelines
          </button>
        </div>

        <label className="checkbox-label" htmlFor="guidelinesCheckbox">
          <input
            id="guidelinesCheckbox"
            type="checkbox"
            className="checkbox-input"
            checked={state.guidelinesAgreed}
            onChange={(e) => onToggleGuidelines(e.target.checked)}
          />
          <span>
            I have read, understood, and agree to the <strong>Celebration Area Guidelines</strong> (Usage is 1 hour, arrive on time, outside food/decorations not permitted).
          </span>
        </label>
      </div>

      {/* Guidelines Modal */}
      <GuidelinesModal
        isOpen={isGuidelinesOpen}
        onClose={() => setIsGuidelinesOpen(false)}
        onAgreeAndClose={() => {
          onToggleGuidelines(true);
          setIsGuidelinesOpen(false);
        }}
      />

      {/* Receipt Proof Zoom Modal */}
      {isReceiptZoomOpen && state.paymentScreenshot && (
        <div className="combo-preview-overlay" onClick={() => setIsReceiptZoomOpen(false)}>
          <div className="combo-preview-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div className="combo-preview-header">
              <h3 className="combo-preview-title">Payment Screenshot Proof</h3>
              <button 
                type="button" 
                className="combo-modal-close" 
                onClick={() => setIsReceiptZoomOpen(false)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            <div className="combo-preview-img-container" style={{ background: '#0F172A', padding: '0.75rem' }}>
              <img 
                src={state.paymentScreenshot} 
                alt="Uploaded Payment Receipt" 
                style={{ maxHeight: '68vh', maxWidth: '100%', objectFit: 'contain' }}
              />
            </div>
            <div className="combo-preview-footer" style={{ justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>
                {state.paymentScreenshotName || 'payment_receipt.jpg'}
              </span>
              <button 
                type="button" 
                className="btn-modal-primary" 
                onClick={() => setIsReceiptZoomOpen(false)}
                style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem' }}
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
