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
  Gift,
  Edit3,
  Trash2,
  MessageCircle
} from 'lucide-react';
import { ManageableBooking } from '../types/booking';
import { bookingApi } from '../services/bookingApi';
import { STANDARD_TIME_SLOTS } from '../config/constants';
import {
  formatCelebrationDate,
  formatTimeSlotRange,
  isCancellationAllowed,
  getKolkataToday,
  addDays,
  isPastSlot
} from '../utils/dateUtils';
import {
  getBranchWhatsAppNumber,
  buildWhatsAppRescheduleMessage,
  openWhatsAppChat
} from '../utils/whatsappUtils';

interface ManageBookingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBookingCancelled?: () => void;
  onBookingUpdated?: () => void;
}

type TabType = 'edit' | 'cancel';

export const ManageBookingsModal: React.FC<ManageBookingsModalProps> = ({
  isOpen,
  onClose,
  onBookingCancelled,
  onBookingUpdated
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('edit');
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [isLoading, setIsLoading] = useState(false);
  const [searchedPhone, setSearchedPhone] = useState('');
  const [bookings, setBookings] = useState<ManageableBooking[] | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [updatedBookingInfo, setUpdatedBookingInfo] = useState<ManageableBooking | null>(null);

  // Cancellation state
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState<string>('');
  const [editSlot, setEditSlot] = useState<string>('');
  const [editGuests, setEditGuests] = useState<number>(4);
  const [editOccasion, setEditOccasion] = useState<string>('Birthday');
  const [editNotes, setEditNotes] = useState<string>('');
  const [editSlots, setEditSlots] = useState<string[]>([]);
  const [isLoadingEditSlots, setIsLoadingEditSlots] = useState<boolean>(false);
  const [isSavingEdit, setIsSavingEdit] = useState<boolean>(false);
  const [editError, setEditError] = useState<string | null>(null);

  const todayStr = getKolkataToday();
  const maxDateStr = addDays(todayStr, 45);

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
    setEditingId(null);
    setUpdatedBookingInfo(null);

    try {
      const fullPhone = `${countryCode}${cleanDigits}`;
      const results = await bookingApi.fetchBookingsByPhone(fullPhone);
      setBookings(results);
      setSearchedPhone(`${countryCode} ${cleanDigits}`);

      // High-speed background pre-warming: prefetch availability for all booking dates & next days
      if (Array.isArray(results) && results.length > 0) {
        results.forEach(b => {
          if (b.location && b.date) {
            bookingApi.prefetchSlots(b.location, [
              b.date,
              addDays(b.date, 1),
              addDays(b.date, 2)
            ]);
          }
        });
      }
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

      // Update booking status in local state
      setBookings(prev => {
        if (!prev) return null;
        return prev.map(b => b.bookingId === bookingId ? { ...b, status: 'CANCELLED' } : b);
      });

      setSuccessMessage(res.message || 'Your celebration booking has been successfully cancelled.');
      setCancellingId(null);

      if (onBookingCancelled) {
        onBookingCancelled();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to cancel the booking. Please try again.');
    } finally {
      setIsCancelling(false);
    }
  };

  const fetchSlotsForEdit = async (location: string, date: string, currentSlot: string) => {
    if (!location || !date) return;

    // 1. Instant cache check (0ms instant render if previously visited or prefetched)
    const cached = bookingApi.getCachedSlots(location, date);
    if (cached) {
      const slotsWithCurrent = Array.from(new Set([currentSlot, ...cached].filter(Boolean)));
      setEditSlots(slotsWithCurrent);
      setIsLoadingEditSlots(false);
      setEditError(null);
    } else {
      setIsLoadingEditSlots(true);
      setEditError(null);
    }

    // 2. Silently prefetch upcoming adjacent days in background for instant navigation
    bookingApi.prefetchSlots(location, [
      addDays(date, 1),
      addDays(date, 2),
      addDays(date, 3)
    ]);

    // 3. Fetch live data
    try {
      const res = await bookingApi.fetchAvailableSlots(location, date);
      if (res.success) {
        const slots = res.availableSlots || [];
        const combined = Array.from(new Set([currentSlot, ...slots].filter(Boolean)));
        setEditSlots(combined);
      } else {
        if (!cached) {
          setEditError(res.error || 'Could not load time slots for this date.');
        }
      }
    } catch (err: any) {
      if (!cached) {
        setEditError(err.message || 'Could not load time slots for this date.');
      }
    } finally {
      setIsLoadingEditSlots(false);
    }
  };

  const handleStartEdit = (b: ManageableBooking) => {
    setCancellingId(null);
    setEditingId(b.bookingId);
    setEditDate(b.date);
    setEditSlot(b.timeSlot);
    setEditGuests(b.guests || 4);
    setEditOccasion(b.occasion || 'Birthday');
    setEditNotes(b.additionalRequirements || '');
    setEditError(null);
    setErrorMessage(null);
    setSuccessMessage(null);
    setUpdatedBookingInfo(null);

    // Synchronously check cache before async fetch
    const cached = bookingApi.getCachedSlots(b.location, b.date);
    if (cached) {
      setEditSlots(Array.from(new Set([b.timeSlot, ...cached].filter(Boolean))));
      setIsLoadingEditSlots(false);
    } else {
      setIsLoadingEditSlots(true);
    }

    fetchSlotsForEdit(b.location, b.date, b.timeSlot);
  };

  const handleEditDateChange = (newDate: string, location: string, currentSlot: string) => {
    setEditDate(newDate);

    // Instant cache inspection
    const cached = bookingApi.getCachedSlots(location, newDate);
    if (cached) {
      setEditSlots(Array.from(new Set([currentSlot, ...cached].filter(Boolean))));
      setIsLoadingEditSlots(false);
    } else {
      setIsLoadingEditSlots(true);
    }

    fetchSlotsForEdit(location, newDate, currentSlot);
  };

  const handleSaveEdit = async (b: ManageableBooking) => {
    if (!editDate || !editSlot) {
      setEditError('Please select both a celebration date and a time slot.');
      return;
    }

    setIsSavingEdit(true);
    setEditError(null);
    setErrorMessage(null);

    try {
      const fullPhone = searchedPhone || `${countryCode}${phone.replace(/\D/g, '')}`;
      const res = await bookingApi.editBooking({
        bookingId: b.bookingId,
        phone: fullPhone,
        date: editDate,
        timeSlot: editSlot,
        guests: editGuests,
        occasion: editOccasion,
        additionalRequirements: editNotes
      });

      const updatedObj: ManageableBooking = {
        ...b,
        date: editDate,
        timeSlot: editSlot,
        guests: editGuests,
        occasion: editOccasion,
        additionalRequirements: editNotes
      };

      setBookings(prev => {
        if (!prev) return null;
        return prev.map(item => item.bookingId === b.bookingId ? updatedObj : item);
      });

      setSuccessMessage(res.message || 'Celebration booking successfully updated!');
      setUpdatedBookingInfo(updatedObj);
      setEditingId(null);

      if (onBookingUpdated) {
        onBookingUpdated();
      }
      if (onBookingCancelled) {
        onBookingCancelled();
      }
    } catch (err: any) {
      setEditError(err.message || 'Failed to update booking. Please try again.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleShareOnWhatsApp = (b: ManageableBooking) => {
    const branchPhone = getBranchWhatsAppNumber(b.location);
    const msg = buildWhatsAppRescheduleMessage({
      bookingId: b.bookingId,
      location: b.location,
      name: b.name,
      date: b.date,
      timeSlot: b.timeSlot,
      guests: b.guests,
      occasion: b.occasion,
      notes: b.additionalRequirements
    });
    const url = `https://wa.me/${branchPhone}?text=${encodeURIComponent(msg)}`;
    openWhatsAppChat(url);
  };

  const handleResetSearch = () => {
    setBookings(null);
    setSearchedPhone('');
    setErrorMessage(null);
    setSuccessMessage(null);
    setCancellingId(null);
    setEditingId(null);
    setUpdatedBookingInfo(null);
  };

  return (
    <div
      className="manage-fullscreen-view animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="manage-booking-title"
    >
      {/* Sticky Fullscreen Top Navigation Bar */}
      <div className="manage-fullscreen-navbar">
        <div className="manage-fullscreen-navbar-left">
          <button
            type="button"
            className="manage-fs-back-btn"
            onClick={onClose}
            aria-label="Back to booking form"
            title="Back to Booking Form"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h2 id="manage-booking-title" className="manage-fullscreen-title">
              Cancel / Edit Booking
            </h2>
            <p className="manage-fullscreen-subtitle">
              Zelebrae Celebration Point
            </p>
          </div>
        </div>

        <button
          type="button"
          className="manage-fs-close-btn"
          onClick={onClose}
          aria-label="Close"
          title="Close"
        >
          <X size={20} />
        </button>
      </div>

      {/* Main Full-Screen Body Container */}
      <div className="manage-fullscreen-content">

        {/* Tab Switcher: Edit / Reschedule vs Cancel */}
        <div className="manage-modal-tabs">
          <button
            type="button"
            className={`manage-tab-btn ${activeTab === 'edit' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('edit');
              setCancellingId(null);
              setErrorMessage(null);
            }}
          >
            <Edit3 size={15} />
            <span>Edit / Reschedule</span>
          </button>
          <button
            type="button"
            className={`manage-tab-btn cancel-active ${activeTab === 'cancel' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('cancel');
              setEditingId(null);
              setErrorMessage(null);
            }}
          >
            <Trash2 size={15} />
            <span>Cancel Booking</span>
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
          <div className="manage-alert success animate-fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CheckCircle2 size={18} />
              <span>{successMessage}</span>
            </div>
            {updatedBookingInfo && (
              <button
                type="button"
                className="btn btn-secondary"
                style={{
                  fontSize: '0.78rem',
                  padding: '0.35rem 0.75rem',
                  background: '#FFFFFF',
                  color: '#065F46',
                  borderColor: '#A7F3D0',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  marginTop: '0.25rem'
                }}
                onClick={() => handleShareOnWhatsApp(updatedBookingInfo)}
              >
                <MessageCircle size={14} color="#10B981" />
                <span>Send Updated Details on WhatsApp</span>
              </button>
            )}
          </div>
        )}

        {/* View 1: Phone Search Screen */}
        {!bookings ? (
          <div className="manage-fullscreen-search-card animate-fade-in">
            <form onSubmit={handleSearch} className="manage-search-form">
              <p className="manage-modal-subtitle">
                {activeTab === 'edit'
                  ? 'Enter your registered WhatsApp or mobile number to find your reservation and reschedule your celebration date, time slot, or guest count.'
                  : 'Enter your registered WhatsApp or mobile number to find your reservation and cancel an upcoming celebration slot.'}
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
                ) : activeTab === 'edit' ? (
                  <>
                    <Edit3 size={18} />
                    <span>Find Booking to Edit</span>
                  </>
                ) : (
                  <>
                    <Search size={18} />
                    <span>Find Booking to Cancel</span>
                  </>
                )}
              </button>
            </form>
          </div>
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
                  const isBeingEdited = editingId === b.bookingId;
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

                      {/* Inline Editing Panel */}
                      {isBeingEdited && (
                        <div className="manage-edit-panel animate-fade-in">
                          <div className="manage-edit-title">
                            <Edit3 size={16} />
                            <span>Reschedule Celebration & Update Details</span>
                          </div>

                          {editError && (
                            <div className="manage-alert error animate-fade-in" style={{ marginBottom: '0.85rem' }}>
                              <AlertCircle size={15} />
                              <span>{editError}</span>
                            </div>
                          )}

                          {/* Quick 1-Tap Date Navigation */}
                          <div style={{ marginBottom: '0.85rem' }}>
                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: '0.35rem' }}>
                              Quick Date Select (1-Tap Fast Switch)
                            </label>
                            <div className="manage-quick-dates">
                              {(b.date && !([todayStr, addDays(todayStr, 1), addDays(todayStr, 2), addDays(todayStr, 3), addDays(todayStr, 4)].includes(b.date))
                                ? [{ label: 'Booked Date', date: b.date, display: formatCelebrationDate(b.date).split(',')[0] }]
                                : []
                              ).concat([
                                { label: 'Today', date: todayStr, display: formatCelebrationDate(todayStr).split(',')[0] },
                                { label: 'Tomorrow', date: addDays(todayStr, 1), display: formatCelebrationDate(addDays(todayStr, 1)).split(',')[0] },
                                { label: 'In 2 Days', date: addDays(todayStr, 2), display: formatCelebrationDate(addDays(todayStr, 2)).split(',')[0] },
                                { label: 'In 3 Days', date: addDays(todayStr, 3), display: formatCelebrationDate(addDays(todayStr, 3)).split(',')[0] },
                                { label: 'In 4 Days', date: addDays(todayStr, 4), display: formatCelebrationDate(addDays(todayStr, 4)).split(',')[0] }
                              ]).map((opt) => {
                                const isSelected = editDate === opt.date;
                                return (
                                  <button
                                    key={opt.date}
                                    type="button"
                                    className={`manage-quick-date-chip ${isSelected ? 'active' : ''}`}
                                    onClick={() => handleEditDateChange(opt.date, b.location, b.timeSlot)}
                                  >
                                    <span className="chip-label">{opt.label}</span>
                                    <span className="chip-date">{opt.display}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          <div className="manage-edit-grid">
                            <div className="manage-edit-field">
                              <label>Celebration Date</label>
                              <input
                                type="date"
                                min={todayStr}
                                max={maxDateStr}
                                value={editDate}
                                onChange={(e) => handleEditDateChange(e.target.value, b.location, b.timeSlot)}
                              />
                            </div>

                            <div className="manage-edit-field">
                              <label>Number of Guests (1-15)</label>
                              <input
                                type="number"
                                min={1}
                                max={15}
                                value={editGuests}
                                onChange={(e) => setEditGuests(Math.max(1, Math.min(15, parseInt(e.target.value) || 1)))}
                              />
                            </div>

                            <div className="manage-edit-field" style={{ gridColumn: '1 / -1' }}>
                              <label>Occasion</label>
                              <select
                                value={editOccasion}
                                onChange={(e) => setEditOccasion(e.target.value)}
                              >
                                <option value="Birthday">Birthday Celebration</option>
                                <option value="Anniversary">Anniversary</option>
                                <option value="Bride to Be">Bride to Be</option>
                                <option value="Groom to Be">Groom to Be</option>
                                <option value="Mom to Be">Mom to Be</option>
                                <option value="Farewell">Farewell / Reunion</option>
                                <option value="Other">Special Celebration</option>
                              </select>
                            </div>
                          </div>

                          {/* Time Slots Selection with Live Loading Skeleton & Status Badges */}
                          <div className="manage-edit-slots-wrap">
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                              <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                <Clock size={14} color="var(--color-brand-purple)" />
                                <span>Select Celebration Time Slot</span>
                              </label>
                              {isLoadingEditSlots && (
                                <span style={{ fontSize: '0.72rem', color: 'var(--color-brand-purple)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                                  <Loader2 size={12} className="animate-spin" />
                                  Searching live slots...
                                </span>
                              )}
                            </div>

                            {/* Animated Shimmer Skeleton Loader */}
                            {isLoadingEditSlots ? (
                              <div className="manage-slot-loading-state animate-fade-in">
                                <div className="manage-slot-loading-header">
                                  <Loader2 size={15} className="animate-spin" />
                                  <span>Searching live celebration slots for {formatCelebrationDate(editDate)}...</span>
                                </div>
                                <div className="manage-slot-skeleton-grid">
                                  {Array.from({ length: 8 }).map((_, i) => (
                                    <div key={i} className="manage-slot-skeleton-chip" />
                                  ))}
                                </div>
                              </div>
                            ) : (
                              /* Full Slot Schedule with Status Badges */
                              <div className="manage-edit-slots-grid animate-fade-in">
                                {STANDARD_TIME_SLOTS.map((s) => {
                                  const isCurrentBookingSlot = (b.timeSlot === s.time && editDate === b.date);
                                  const isPast = isPastSlot(editDate, s.time);
                                  const isAvailable = editSlots.includes(s.time);
                                  const isBookedByOther = !isAvailable && !isPast && !isCurrentBookingSlot;
                                  const isSelected = editSlot === s.time;
                                  const canSelect = isAvailable || isCurrentBookingSlot;

                                  return (
                                    <button
                                      key={s.time}
                                      type="button"
                                      className={`manage-edit-slot-btn ${isSelected ? 'selected' : ''} ${isCurrentBookingSlot ? 'is-current' : ''} ${isPast ? 'is-passed' : ''} ${isBookedByOther ? 'is-booked' : ''}`}
                                      onClick={() => {
                                        if (canSelect) {
                                          setEditSlot(s.time);
                                        }
                                      }}
                                      disabled={!canSelect}
                                      title={
                                        isCurrentBookingSlot
                                          ? 'Your currently booked celebration slot'
                                          : isPast
                                          ? 'This slot time has already passed'
                                          : isBookedByOther
                                          ? 'Already booked by another guest'
                                          : `Available: ${s.time} (${formatTimeSlotRange(s.time)})`
                                      }
                                    >
                                      <span className="slot-time-text">{s.time}</span>
                                      {isCurrentBookingSlot && (
                                        <span className="manage-slot-badge badge-current">Current Slot</span>
                                      )}
                                      {!isCurrentBookingSlot && isAvailable && (
                                        <span className="manage-slot-badge badge-available">Available</span>
                                      )}
                                      {!isCurrentBookingSlot && isPast && (
                                        <span className="manage-slot-badge badge-passed">Passed</span>
                                      )}
                                      {!isCurrentBookingSlot && isBookedByOther && (
                                        <span className="manage-slot-badge badge-booked">Booked</span>
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            )}

                            {/* Schedule Legend & Information */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: '0.5rem', flexWrap: 'wrap', gap: '0.4rem' }}>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                                <Clock size={12} color="var(--color-brand-purple)" />
                                1-hour private celebration slot
                              </span>
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.65rem' }}>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#10B981' }}></span>
                                  Available
                                </span>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#EF4444' }}></span>
                                  Booked
                                </span>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#94A3B8' }}></span>
                                  Passed
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="manage-edit-field">
                            <label>Special Instructions / Notes</label>
                            <textarea
                              rows={2}
                              value={editNotes}
                              onChange={(e) => setEditNotes(e.target.value)}
                              placeholder="Any custom requests or requirements..."
                            />
                          </div>

                          <div className="manage-edit-actions">
                            <button
                              type="button"
                              className="btn btn-secondary"
                              style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem' }}
                              onClick={() => setEditingId(null)}
                              disabled={isSavingEdit}
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              className="btn btn-cta"
                              style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }}
                              onClick={() => handleSaveEdit(b)}
                              disabled={isSavingEdit || !editSlot}
                            >
                              {isSavingEdit ? (
                                <>
                                  <Loader2 size={14} className="animate-spin" />
                                  <span>Saving Changes...</span>
                                </>
                              ) : (
                                <span>Save Changes</span>
                              )}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Card Actions (When not editing) */}
                      {isConfirmed && !isBeingEdited && (
                        <div className="manage-card-actions" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                          {cancelEligibility.allowed ? (
                            isBeingCancelled ? (
                              <div className="cancel-confirm-box animate-fade-in">
                                <p className="cancel-confirm-prompt">
                                  Are you sure you want to cancel this celebration? Your slot will be released immediately.
                                </p>
                                <div className="cancel-confirm-btns" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
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
                                    style={{ color: 'var(--color-brand-purple)', borderColor: 'var(--color-brand-purple)' }}
                                    onClick={() => {
                                      setCancellingId(null);
                                      handleStartEdit(b);
                                    }}
                                    disabled={isCancelling}
                                  >
                                    <Edit3 size={13} />
                                    <span>Reschedule Instead</span>
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
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', width: '100%' }}>
                                {activeTab === 'edit' ? (
                                  <>
                                    <button
                                      type="button"
                                      className="btn btn-cta"
                                      style={{ width: '100%', justifyContent: 'center', fontSize: '0.85rem', padding: '0.55rem 1rem' }}
                                      onClick={() => handleStartEdit(b)}
                                    >
                                      <Edit3 size={15} />
                                      <span>Edit / Reschedule This Booking</span>
                                    </button>
                                    <button
                                      type="button"
                                      className="btn btn-ghost"
                                      style={{ fontSize: '0.78rem', color: '#E11D48', padding: '0.25rem', alignSelf: 'center' }}
                                      onClick={() => {
                                        setActiveTab('cancel');
                                        setCancellingId(b.bookingId);
                                      }}
                                    >
                                      Need to cancel this booking instead?
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      type="button"
                                      className="btn btn-danger"
                                      style={{ width: '100%', justifyContent: 'center', fontSize: '0.85rem', padding: '0.55rem 1rem' }}
                                      onClick={() => {
                                        setCancellingId(b.bookingId);
                                        setEditingId(null);
                                        setErrorMessage(null);
                                        setSuccessMessage(null);
                                      }}
                                    >
                                      <Trash2 size={15} />
                                      <span>Cancel This Celebration</span>
                                    </button>
                                    <button
                                      type="button"
                                      className="btn btn-ghost"
                                      style={{ fontSize: '0.78rem', color: 'var(--color-brand-purple)', padding: '0.25rem', alignSelf: 'center' }}
                                      onClick={() => {
                                        setActiveTab('edit');
                                        handleStartEdit(b);
                                      }}
                                    >
                                      Want to reschedule to a new date instead?
                                    </button>
                                  </>
                                )}
                              </div>
                            )
                          ) : (
                            <div className="cancel-locked-notice animate-fade-in">
                              <div className="cancel-locked-header">
                                <AlertCircle size={15} className="cancel-locked-icon" />
                                <span className="cancel-locked-title">Modifications Locked</span>
                              </div>
                              <p className="cancel-locked-desc">
                                {cancelEligibility.reason || 'Cannot modify because it has passed the minimum required notice period for this celebration.'}
                              </p>
                              <a
                                href={`https://wa.me/${getBranchWhatsAppNumber(b.location)}?text=${encodeURIComponent(`Hello Zelebrae, I need urgent assistance regarding my celebration booking ${b.bookingId} on ${b.date} at ${b.timeSlot}.`)}`}
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
