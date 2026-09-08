import React, { useState } from 'react';
import {
  X,
  Calendar,
  Clock,
  MapPin,
  Phone,
  Users,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ArrowLeft,
  Search,
  Gift
} from 'lucide-react';
import { ManageableBooking } from '../types/booking';
import { bookingApi } from '../services/bookingApi';
import { formatCelebrationDate, formatTimeSlotRange, isCancellationAllowed } from '../utils/dateUtils';

interface ManageBookingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBookingCancelled?: () => void;
}

export const ManageBookingsModal: React.FC<ManageBookingsModalProps> = ({
  isOpen,
  onClose,
  onBookingCancelled
}) => {
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [isLoading, setIsLoading] = useState(false);
  const [searchedPhone, setSearchedPhone] = useState('');
  const [bookings, setBookings] = useState<ManageableBooking[] | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Track which booking ID is currently pending cancellation confirmation
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

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

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanDigits = phone.replace(/\D/g, '');
    if (!cleanDigits || cleanDigits.length < 10) {
      setErrorMessage('Please enter a valid 10-digit mobile number.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setCancellingId(null);

    try {
      const fullPhone = `${countryCode}${cleanDigits}`;
      const results = await bookingApi.fetchBookingsByPhone(fullPhone);
      setBookings(results);
      setSearchedPhone(`${countryCode} ${cleanDigits}`);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to search bookings. Please try again.');
      setBookings(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmCancel = async (bookingId: string) => {
    if (!searchedPhone && !phone) return;
    setIsCancelling(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const fullPhone = searchedPhone || `${countryCode}${phone.replace(/\D/g, '')}`;
      const res = await bookingApi.cancelBooking(bookingId, fullPhone);

      // Update the booking status in the local state
      setBookings(prev => {
        if (!prev) return null;
        return prev.map(b => b.bookingId === bookingId ? { ...b, status: 'CANCELLED' } : b);
      });

      setSuccessMessage(res.message || 'Your celebration booking has been successfully cancelled.');
      setCancellingId(null);

      // Notify parent to refresh slots if needed
      if (onBookingCancelled) {
        onBookingCancelled();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to cancel the booking. Please try again.');
    } finally {
      setIsCancelling(false);
    }
  };

  const handleResetSearch = () => {
    setBookings(null);
    setSearchedPhone('');
    setErrorMessage(null);
    setSuccessMessage(null);
    setCancellingId(null);
  };

  return (
    <div
      className="modal-overlay animate-fade-in"
      onClick={onClose}
      onTouchMove={(e) => {
        if (e.target === e.currentTarget) {
          e.preventDefault();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="manage-booking-title"
    >
      <div
        className="modal-content manage-modal-card"
        onClick={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="manage-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <h2 id="manage-booking-title" className="manage-modal-title">
              Manage Celebration Bookings
            </h2>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close manage bookings"
          >
            <X size={20} />
          </button>
        </div>

        {/* Feedback Banners */}
        {errorMessage && (
          <div className="manage-alert error animate-fade-in">
            <AlertCircle size={18} />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="manage-alert success animate-fade-in">
            <CheckCircle2 size={18} />
            <span>{successMessage}</span>
          </div>
        )}

        {/* View 1: Phone Search Screen */}
        {!bookings ? (
          <form onSubmit={handleSearch} className="manage-search-form">
            <p className="manage-modal-subtitle">
              Enter your registered WhatsApp / mobile number to look up your reservations and cancel an upcoming slot if needed.
            </p>

            <div className="input-group" style={{ marginTop: '1.25rem' }}>
              <label htmlFor="managePhoneInput" className="input-label">
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Phone size={15} color="var(--color-brand-purple)" />
                  Registered Mobile Number <span className="required-star">*</span>
                </span>
              </label>
              <div className="phone-input-wrap">
                <select
                  className="country-code-select"
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  aria-label="Country Code"
                >
                  <option value="+91">IN (+91)</option>
                  <option value="+971">UAE (+971)</option>
                  <option value="+966">KSA (+966)</option>
                  <option value="+974">QA (+974)</option>
                  <option value="+44">UK (+44)</option>
                  <option value="+1">US (+1)</option>
                </select>
                <input
                  id="managePhoneInput"
                  type="tel"
                  className="input-field"
                  placeholder="85858 55859"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/[^\d\s]/g, ''))}
                  autoFocus
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-cta"
              style={{ width: '100%', marginTop: '1.5rem', justifyContent: 'center' }}
              disabled={isLoading || phone.replace(/\D/g, '').length < 10}
            >
              {isLoading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Searching Bookings...</span>
                </>
              ) : (
                <>
                  <Search size={18} />
                  <span>Find My Bookings</span>
                </>
              )}
            </button>
          </form>
        ) : (
          /* View 2: Bookings List Screen */
          <div className="manage-results-view animate-fade-in">
            <div className="manage-results-header">
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                  Showing Bookings for
                </span>
                <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-brand-purple)' }}>
                  {searchedPhone}
                </div>
              </div>
              <button
                type="button"
                className="btn btn-ghost"
                style={{ fontSize: '0.82rem', padding: '0.35rem 0.65rem' }}
                onClick={handleResetSearch}
              >
                <ArrowLeft size={14} />
                <span>Search Another</span>
              </button>
            </div>

            {bookings.length === 0 ? (
              <div className="manage-empty-state">
                <div className="manage-empty-icon">
                  <Calendar size={32} color="var(--color-brand-purple)" />
                </div>
                <h3>No Bookings Found</h3>
                <p>We couldn't find any celebration bookings associated with {searchedPhone}.</p>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleResetSearch}
                  style={{ marginTop: '1rem' }}
                >
                  Try a Different Number
                </button>
              </div>
            ) : (
              <div className="manage-bookings-list">
                {bookings.map((b) => {
                  const isConfirmed = b.status === 'CONFIRMED';
                  const isBeingCancelled = cancellingId === b.bookingId;
                  const cancelEligibility = isCancellationAllowed(b.date, b.timeSlot);

                  return (
                    <div key={b.bookingId} className={`manage-booking-card ${!isConfirmed ? 'cancelled' : ''}`}>
                      <div className="manage-card-top">
                        <div>
                          <span className="manage-booking-id">{b.bookingId}</span>
                          <h4 className="manage-booking-occasion">
                            {b.occasion || 'Celebration'}
                          </h4>
                        </div>
                        <span className={`status-pill ${isConfirmed ? 'status-confirmed' : 'status-cancelled'}`}>
                          {isConfirmed ? 'CONFIRMED' : 'CANCELLED'}
                        </span>
                      </div>

                      <div className="manage-card-details">
                        <div className="manage-detail-item">
                          <MapPin size={14} color="var(--color-brand-purple)" />
                          <span>{b.location}</span>
                        </div>
                        <div className="manage-detail-item">
                          <Calendar size={14} color="var(--color-brand-purple)" />
                          <span>{formatCelebrationDate(b.date)}</span>
                        </div>
                        <div className="manage-detail-item">
                          <Clock size={14} color="var(--color-brand-purple)" />
                          <span>{b.timeSlot} ({formatTimeSlotRange(b.timeSlot)})</span>
                        </div>
                        <div className="manage-detail-item">
                          <Users size={14} color="#6B7280" />
                          <span>{b.guests} {b.guests === 1 ? 'Guest' : 'Guests'}</span>
                        </div>
                        {b.combo && b.combo !== 'None' && b.combo !== 'none' && (
                          <div className="manage-detail-item">
                            <Gift size={14} color="#D97706" />
                            <span>{b.combo}</span>
                          </div>
                        )}
                      </div>

                      {/* Cancellation Actions */}
                      {isConfirmed && (
                        <div className="manage-card-actions">
                          {cancelEligibility.allowed ? (
                            isBeingCancelled ? (
                              <div className="cancel-confirm-box animate-fade-in">
                                <p className="cancel-confirm-prompt">
                                  Are you sure you want to cancel this celebration? Your slot will be released immediately.
                                </p>
                                <div className="cancel-confirm-btns">
                                  <button
                                    type="button"
                                    className="btn btn-danger"
                                    onClick={() => handleConfirmCancel(b.bookingId)}
                                    disabled={isCancelling}
                                  >
                                    {isCancelling ? (
                                      <>
                                        <Loader2 size={14} className="animate-spin" />
                                        <span>Cancelling...</span>
                                      </>
                                    ) : (
                                      <span>Yes, Cancel Booking</span>
                                    )}
                                  </button>
                                  <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => setCancellingId(null)}
                                    disabled={isCancelling}
                                  >
                                    Keep Booking
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                type="button"
                                className="btn btn-cancel-booking"
                                onClick={() => {
                                  setCancellingId(b.bookingId);
                                  setErrorMessage(null);
                                  setSuccessMessage(null);
                                }}
                              >
                                Cancel This Celebration
                              </button>
                            )
                          ) : (
                            <div className="cancel-locked-notice animate-fade-in">
                              <div className="cancel-locked-header">
                                <AlertCircle size={15} className="cancel-locked-icon" />
                                <span className="cancel-locked-title">Cancellation Not Available</span>
                              </div>
                              <p className="cancel-locked-desc">
                                {cancelEligibility.reason || 'Cannot cancel because it has passed the minimum 2-hour required notice for cancellation.'}
                              </p>
                              <a
                                href={`https://wa.me/918585855859?text=${encodeURIComponent(`Hello Zelebrae, I need urgent assistance regarding my celebration booking ${b.bookingId} on ${b.date} at ${b.timeSlot}.`)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn-cancel-whatsapp"
                              >
                                <Phone size={12} />
                                <span>Need Help? Chat on WhatsApp</span>
                              </a>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
