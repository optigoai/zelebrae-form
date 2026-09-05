import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { 
  CheckCircle2, 
  MessageCircle, 
  Calendar as CalendarIcon, 
  ArrowLeft, 
  Copy, 
  Check 
} from 'lucide-react';
import { BookingState, CelebrationLocation } from '../types/booking';
import { formatCelebrationDate, formatTimeSlotRange } from '../utils/dateUtils';

interface SuccessScreenProps {
  bookingId: string;
  state: BookingState;
  locations: CelebrationLocation[];
  onReset: () => void;
  businessWhatsApp?: string;
}

export const SuccessScreen: React.FC<SuccessScreenProps> = ({
  bookingId,
  state,
  locations,
  onReset,
  businessWhatsApp = '919072333600'
}) => {
  const [copied, setCopied] = React.useState(false);

  // Trigger celebration confetti on mount
  useEffect(() => {
    try {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#4A1E5F', '#1B8755', '#D97706', '#E11D48', '#8B5CF6']
      });
    } catch (e) {
      // Confetti fallback
    }
  }, []);

  const currentLocation = locations.find(l => l.id === state.location);
  const locationName = currentLocation?.name || 'Ashokapuram Celebration Point';
  const celebrationDate = formatCelebrationDate(state.date);
  const celebrationSlotRange = formatTimeSlotRange(state.timeSlot);
  const occasionName = state.occasion === 'other' && state.customOccasion 
    ? state.customOccasion 
    : state.occasion;

  // Build official WhatsApp message
  const whatsappMessage = `Hi Zelebrae, I have completed my celebration booking.

Booking ID: ${bookingId}
Name: ${state.name}
Location: ${locationName}
Date: ${celebrationDate}
Time: ${state.timeSlot} (${celebrationSlotRange})
Occasion: ${occasionName}
Guests: ${state.guests}${state.combo && state.combo !== 'none' ? `\nCombo: ${state.comboPackage ? `${state.comboPackage} (₹${state.comboPrice})` : state.combo}` : ''}
WhatsApp: ${state.countryCode} ${state.whatsapp}
${state.additionalRequirements ? `Notes: ${state.additionalRequirements}` : ''}`;

  const whatsappUrl = `https://wa.me/${businessWhatsApp}?text=${encodeURIComponent(whatsappMessage)}`;

  // Copy booking ID
  const handleCopyId = () => {
    navigator.clipboard.writeText(bookingId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Add to Calendar (.ics file generation)
  const handleAddToCalendar = () => {
    const cleanDate = state.date.replace(/-/g, '');
    const title = `Zelebrae Celebration — ${occasionName}`;
    const desc = `Private celebration booking at ${locationName}. Booking ID: ${bookingId}. Customer: ${state.name}.`;
    const loc = `${locationName}, Kozhikode`;

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Zelebrae Pastries//Celebration Point//EN',
      'BEGIN:VEVENT',
      `SUMMARY:${title}`,
      `DESCRIPTION:${desc}`,
      `LOCATION:${loc}`,
      `DTSTART;VALUE=DATE:${cleanDate}`,
      `DTEND;VALUE=DATE:${cleanDate}`,
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', `zelebrae-celebration-${bookingId}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="success-wrapper animate-fade-in">
      <div className="success-icon-badge">
        <CheckCircle2 size={46} strokeWidth={2.5} />
      </div>

      <h1 style={{ fontSize: '2rem', marginBottom: '0.35rem', color: 'var(--color-brand-purple)' }}>
        You're all set!
      </h1>
      <p style={{ fontSize: '1.05rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>
        Your celebration has been reserved at Zelebrae Pastries.
      </p>

      {/* Booking ID Pill */}
      <div className="success-booking-id-pill">
        <span className="booking-id-label">Booking ID</span>
        <span className="booking-id-value">{bookingId}</span>
        <button
          type="button"
          onClick={handleCopyId}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-brand-purple)', display: 'flex', alignItems: 'center' }}
          title="Copy Booking ID"
          aria-label="Copy Booking ID"
        >
          {copied ? <Check size={16} color="#1B8755" /> : <Copy size={16} />}
        </button>
      </div>

      {/* Booking Summary Box */}
      <div className="success-summary-card">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <div>
            <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--color-text-muted)', fontWeight: 700 }}>
              Occasion
            </span>
            <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--color-brand-purple)' }}>
              {occasionName}
            </div>
          </div>

          <div>
            <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--color-text-muted)', fontWeight: 700 }}>
              Celebration Point
            </span>
            <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
              {locationName}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            <div>
              <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--color-text-muted)', fontWeight: 700 }}>
                Date
              </span>
              <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>
                {celebrationDate}
              </div>
            </div>
            <div>
              <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--color-text-muted)', fontWeight: 700 }}>
                Time Slot
              </span>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-cta-green)' }}>
                {celebrationSlotRange}
              </div>
            </div>
          </div>

          <div>
            <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--color-text-muted)', fontWeight: 700 }}>
              Reserved For
            </span>
            <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>
              {state.name} • {state.guests} {state.guests === 1 ? 'Guest' : 'Guests'}
            </div>
          </div>

          {state.combo && state.combo !== 'none' && (
            <div>
              <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--color-text-muted)', fontWeight: 700 }}>
                Party Combo
              </span>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-brand-purple)' }}>
                {state.comboPackage ? `${state.comboPackage} (₹${state.comboPrice})` : state.combo}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="success-actions">
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-whatsapp"
        >
          <MessageCircle size={20} />
          <span>Chat on WhatsApp</span>
        </a>

        <button
          type="button"
          className="btn btn-secondary"
          onClick={handleAddToCalendar}
        >
          <CalendarIcon size={18} />
          <span>Add to Calendar</span>
        </button>

        <button
          type="button"
          className="btn btn-ghost"
          onClick={onReset}
          style={{ marginTop: '0.5rem' }}
        >
          <ArrowLeft size={16} />
          <span>Book Another Celebration</span>
        </button>
      </div>
    </div>
  );
};
