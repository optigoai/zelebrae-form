/**
 * Date and Time utilities for Asia/Kolkata timezone
 */

/**
 * Returns today's date in Asia/Kolkata timezone as YYYY-MM-DD
 */
export function getKolkataToday(): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return formatter.format(new Date());
}

/**
 * Format a YYYY-MM-DD string into a friendly celebration date (e.g. "Saturday, Sep 12, 2026")
 */
export function formatCelebrationDate(dateStr: string): string {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-IN', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

/**
 * Short friendly format (e.g. "Sep 12, 2026")
 */
export function formatShortDate(dateStr: string): string {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-IN', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

/**
 * Computes slot range e.g. "4:00 PM" -> "4:00 PM – 5:00 PM"
 */
export function formatTimeSlotRange(timeSlot: string): string {
  if (!timeSlot) return '';
  const match = timeSlot.match(/^(\d{1,2})[:.](\d{2})\s*(AM|PM)$/i);
  if (!match) return timeSlot;

  let hour = parseInt(match[1], 10);
  const minute = match[2];
  let period = match[3].toUpperCase();

  let endHour = hour + 1;
  let endPeriod = period;

  if (hour === 11 && period === 'AM') {
    endHour = 12;
    endPeriod = 'PM';
  } else if (hour === 11 && period === 'PM') {
    endHour = 12;
    endPeriod = 'AM';
  } else if (hour === 12) {
    endHour = 1;
  }

  const formattedEndHour = endHour < 10 ? `0${endHour}` : `${endHour}`;
  return `${timeSlot} – ${formattedEndHour}:${minute} ${endPeriod}`;
}

/**
 * Check if dateStr (YYYY-MM-DD) is in the past relative to today in Asia/Kolkata
 */
export function isPastDate(dateStr: string): boolean {
  const today = getKolkataToday();
  return dateStr < today;
}

/**
 * Adds N days to a YYYY-MM-DD string
 */
export function addDays(dateStr: string, days: number): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

/**
 * Normalizes any slot string format (including Google Sheets 1899 Date strings) into standard "hh:mm A"
 * Example: "Sat Dec 30 1899 09:30:00 GMT..." -> "09:30 AM"
 */
export function normalizeSlotTime(slotStr: string): string {
  if (!slotStr) return '';
  const trimmed = slotStr.trim().replace(/^'/, '');

  // Already in '09:30 AM' or '9:30 AM' format
  const standardMatch = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (standardMatch) {
    const hh = standardMatch[1].padStart(2, '0');
    const mm = standardMatch[2];
    const ampm = standardMatch[3].toUpperCase();
    return `${hh}:${mm} ${ampm}`;
  }

  // If it's a Date string like 'Sat Dec 30 1899 09:30:00 ...' or time without AM/PM like '09:30', '10:30', '01:30'
  const timeMatch = trimmed.match(/(\d{1,2}):(\d{2})(?::\d{2})?/);
  if (timeMatch) {
    let hours = parseInt(timeMatch[1], 10);
    const mins = timeMatch[2];
    let ampm = 'AM';
    if (hours >= 9 && hours <= 11) {
      ampm = 'AM';
    } else if (hours === 12) {
      ampm = 'PM';
    } else if (hours >= 13 && hours <= 21) {
      ampm = 'PM';
      hours -= 12;
    } else if (hours >= 1 && hours <= 8) {
      ampm = 'PM';
    }
    return `${hours.toString().padStart(2, '0')}:${mins} ${ampm}`;
  }

  return trimmed;
}
