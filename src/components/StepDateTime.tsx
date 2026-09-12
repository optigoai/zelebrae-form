import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, AlertCircle, RefreshCw } from 'lucide-react';
import { bookingApi } from '../services/bookingApi';
import {
  getKolkataToday,
  formatCelebrationDate,
  isPastDate,
  addDays,
  normalizeSlotTime,
  isPastSlot
} from '../utils/dateUtils';
import { STANDARD_TIME_SLOTS } from '../config/constants';

interface StepDateTimeProps {
  location: string;
  selectedDate: string; // YYYY-MM-DD
  selectedSlot: string; // e.g. "04:00 PM"
  onSelectDate: (date: string) => void;
  onSelectSlot: (slot: string) => void;
  bookingWindowDays?: number;
}

export const StepDateTime: React.FC<StepDateTimeProps> = ({
  location,
  selectedDate,
  selectedSlot,
  onSelectDate,
  onSelectSlot,
  bookingWindowDays = 45
}) => {
  const todayStr = getKolkataToday();
  const maxDateStr = addDays(todayStr, bookingWindowDays);

  // Month state for calendar view
  const initialDate = selectedDate || todayStr;
  const [initialYear, initialMonth] = initialDate.split('-').map(Number);
  const [viewYear, setViewYear] = useState<number>(initialYear);
  const [viewMonth, setViewMonth] = useState<number>(initialMonth - 1); // 0-indexed

  // Available slots state
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Fetch slots whenever selectedDate changes
  const loadSlots = async (date: string) => {
    if (!date) return;
    setIsLoadingSlots(true);
    setFetchError(null);
    try {
      const res = await bookingApi.fetchAvailableSlots(location, date);
      if (res.success) {
        setAvailableSlots(res.availableSlots || []);
        // If previously selected slot is no longer available or has passed on this date, clear selection
        const normSelected = normalizeSlotTime(selectedSlot);
        const isStillAvailable = (res.availableSlots || []).some(s => normalizeSlotTime(s) === normSelected);
        if (selectedSlot && (!isStillAvailable || isPastSlot(date, selectedSlot))) {
          onSelectSlot('');
        }
      } else {
        setFetchError(res.error || 'Failed to fetch slots for this date.');
        setAvailableSlots([]);
      }
    } catch (err: any) {
      setFetchError(err.message || 'Unable to connect to booking availability.');
      setAvailableSlots([]);
    } finally {
      setIsLoadingSlots(false);
    }
  };

  useEffect(() => {
    if (selectedDate) {
      loadSlots(selectedDate);
    } else {
      // Default to today if no date selected yet
      onSelectDate(todayStr);
    }
  }, [selectedDate, location]);

  useEffect(() => {
    if (selectedDate && selectedSlot && isPastSlot(selectedDate, selectedSlot)) {
      onSelectSlot('');
    }
  }, [selectedDate, selectedSlot, onSelectSlot]);

  // Calendar generation helpers
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay(); // 0 = Sunday

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewYear(viewYear - 1);
      setViewMonth(11);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewYear(viewYear + 1);
      setViewMonth(0);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  // Group all configured slots by period
  const morningSlots = STANDARD_TIME_SLOTS.filter(s => s.period === 'morning');
  const afternoonSlots = STANDARD_TIME_SLOTS.filter(s => s.period === 'afternoon');
  const eveningSlots = STANDARD_TIME_SLOTS.filter(s => s.period === 'evening');

  const isFullyBooked = !isLoadingSlots && !fetchError && availableSlots.length === 0;

  return (
    <div className="animate-fade-in date-time-container">
      <div className="step-header">
        <span className="step-tag">
          <CalendarIcon size={14} />
          Step 3 of 5
        </span>
        <h1 className="step-title">Select Date & Time</h1>

      </div>

      {/* Calendar Card */}
      <div className="calendar-card">
        <div className="calendar-header">
          <h3 className="calendar-month-title">
            {monthNames[viewMonth]} {viewYear}
          </h3>
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <button
              type="button"
              className="calendar-nav-btn"
              onClick={handlePrevMonth}
              aria-label="Previous Month"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              className="calendar-nav-btn"
              onClick={handleNextMonth}
              aria-label="Next Month"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        <div className="calendar-weekdays">
          <span>Su</span>
          <span>Mo</span>
          <span>Tu</span>
          <span>We</span>
          <span>Th</span>
          <span>Fr</span>
          <span>Sa</span>
        </div>

        <div className="calendar-grid">
          {/* Leading empty days */}
          {Array.from({ length: firstDayIndex }).map((_, i) => (
            <div key={`empty-${i}`} className="calendar-day-btn empty" />
          ))}

          {/* Month days */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const dayNum = i + 1;
            const currentFormattedDate = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
            const isSelected = selectedDate === currentFormattedDate;
            const isPast = isPastDate(currentFormattedDate);
            const isBeyondWindow = currentFormattedDate > maxDateStr;
            const isToday = currentFormattedDate === todayStr;
            const isDisabled = isPast || isBeyondWindow;

            return (
              <button
                key={currentFormattedDate}
                type="button"
                className={`calendar-day-btn ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''}`}
                onClick={() => {
                  onSelectDate(currentFormattedDate);
                }}
                disabled={isDisabled}
                aria-label={`${monthNames[viewMonth]} ${dayNum}, ${viewYear} ${isSelected ? '(Selected)' : ''}`}
              >
                {dayNum}
              </button>
            );
          })}
        </div>
      </div>

      {/* Time Slots Card */}
      <div className="slots-card">
        <div className="slots-header">
          <div>
            <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)', fontWeight: 700 }}>
              Selected Date
            </span>
            <div className="slots-selected-date">
              {formatCelebrationDate(selectedDate)}
            </div>
          </div>
          <button
            type="button"
            className="btn btn-ghost"
            style={{ fontSize: '0.8rem', padding: '0.35rem 0.65rem' }}
            onClick={() => loadSlots(selectedDate)}
            disabled={isLoadingSlots}
            title="Refresh available slots"
          >
            <RefreshCw size={14} className={isLoadingSlots ? 'animate-spin' : ''} />
            <span style={{ marginLeft: '4px' }}>Refresh</span>
          </button>
        </div>

        {/* Loading State */}
        {isLoadingSlots && (
          <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
            <div className="pulse-dot" style={{ margin: '0 auto 0.75rem auto', width: '10px', height: '10px' }}></div>
            <p style={{ fontWeight: 600, color: 'var(--color-brand-purple)' }}>
              Finding available celebration times...
            </p>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
              Checking real-time bookings
            </p>
          </div>
        )}

        {/* Fetch Error */}
        {!isLoadingSlots && fetchError && (
          <div style={{ padding: '1rem', background: '#FEF2F2', borderRadius: 'var(--radius-md)', color: '#DC2626', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <AlertCircle size={20} flex-shrink="0" />
            <div style={{ fontSize: '0.85rem' }}>
              <strong>Could not check availability:</strong> {fetchError}
            </div>
          </div>
        )}

        {/* Fully Booked / Passed Banner */}
        {!isLoadingSlots && isFullyBooked && (
          <div style={{ padding: '0.85rem 1rem', background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 'var(--radius-md)', color: '#991B1B', display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
            <AlertCircle size={18} color="#DC2626" />
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
              {selectedDate === todayStr 
                ? `All celebration slots for today (${formatCelebrationDate(selectedDate)}) have passed or are booked. Please choose an upcoming date.`
                : `All slots on ${formatCelebrationDate(selectedDate)} are currently booked. Please select another date.`}
            </span>
          </div>
        )}

        {/* Available and Booked Slots Groups */}
        {!isLoadingSlots && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {morningSlots.length > 0 && (
              <div className="slots-group">
                <div className="slots-group-title">Morning Slots</div>
                <div className="slots-grid">
                  {morningSlots.map(slot => renderSlotButton(slot))}
                </div>
              </div>
            )}

            {afternoonSlots.length > 0 && (
              <div className="slots-group">
                <div className="slots-group-title">Afternoon Slots</div>
                <div className="slots-grid">
                  {afternoonSlots.map(slot => renderSlotButton(slot))}
                </div>
              </div>
            )}

            {eveningSlots.length > 0 && (
              <div className="slots-group">
                <div className="slots-group-title">Evening Slots</div>
                <div className="slots-grid">
                  {eveningSlots.map(slot => renderSlotButton(slot))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--color-text-muted)', paddingTop: '0.75rem', borderTop: '1px dashed var(--color-border-subtle)', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Clock size={14} color="#592F7C" />
                <span>1-hour private slot per pre-order</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#592F7C' }}></span>
                  Available
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#DC2626' }}></span>
                  Booked
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#94A3B8' }}></span>
                  Passed
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  function renderSlotButton(slot: { time: string; endTime: string }) {
    const slotNorm = normalizeSlotTime(slot.time);
    const isPast = isPastSlot(selectedDate, slot.time);
    const isAvailable = !isPast && availableSlots.some(s => normalizeSlotTime(s) === slotNorm);
    const isSelected = !isPast && normalizeSlotTime(selectedSlot) === slotNorm;

    return (
      <button
        key={slot.time}
        type="button"
        className={`slot-btn ${isSelected ? 'selected' : ''} ${isPast ? 'passed' : !isAvailable ? 'booked' : ''}`}
        onClick={() => {
          if (isAvailable) {
            onSelectSlot(slot.time);
          }
        }}
        disabled={!isAvailable}
        aria-pressed={isSelected}
        aria-disabled={!isAvailable}
        title={
          isPast
            ? `${slot.time} (Time has passed)`
            : isAvailable
            ? `${slot.time} (Available)`
            : `${slot.time} (Unavailable / Already Booked)`
        }
      >
        <span className="slot-time">{slot.time}</span>
        {isPast ? (
          <span className="slot-booked-badge slot-passed-badge">Passed</span>
        ) : isAvailable ? (
          <span className="slot-duration">1 hr private slot</span>
        ) : (
          <span className="slot-booked-badge">Booked</span>
        )}
      </button>
    );
  }
};
