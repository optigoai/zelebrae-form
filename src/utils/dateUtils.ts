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

export interface CancellationEligibility {
  allowed: boolean;
  hoursRemaining: number;
  reason?: string;
}

/**
 * Parses a celebration date (YYYY-MM-DD) and time slot ("01:30 PM") into a Date object in IST (+05:30)
 */
export function parseSlotDateTime(dateStr: string, timeSlotStr: string): Date | null {
  if (!dateStr || !timeSlotStr) return null;

  // Normalize date format YYYY-MM-DD
  const parts = dateStr.trim().replace(/\//g, '-').split('-');
  if (parts.length !== 3) return null;
  const y = parts[0];
  const m = parts[1].padStart(2, '0');
  const d = parts[2].padStart(2, '0');
  const cleanDate = `${y}-${m}-${d}`;

  const normalized = normalizeSlotTime(timeSlotStr);
  const match = normalized.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return null;

  let hours = parseInt(match[1], 10);
  const minutes = match[2];
  const ampm = match[3].toUpperCase();

  if (ampm === 'AM') {
    if (hours === 12) hours = 0;
  } else if (ampm === 'PM') {
    if (hours !== 12) hours += 12;
  }

  const hh24 = hours.toString().padStart(2, '0');
  const isoString = `${cleanDate}T${hh24}:${minutes}:00+05:30`;
  const parsed = new Date(isoString);
  return isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Validates whether a booking can be cancelled based on the strict 2-hour advance cutoff rule
 */
export function isCancellationAllowed(dateStr: string, timeSlotStr: string): CancellationEligibility {
  const slotDate = parseSlotDateTime(dateStr, timeSlotStr);
  if (!slotDate) {
    return { allowed: true, hoursRemaining: 999 };
  }

  const now = Date.now();
  const diffMs = slotDate.getTime() - now;
  const hoursRemaining = diffMs / (1000 * 60 * 60);

  if (diffMs <= 0) {
    return {
      allowed: false,
      hoursRemaining,
      reason: 'This celebration time has already passed.'
    };
  }

  if (hoursRemaining < 2) {
    return {
      allowed: false,
      hoursRemaining,
      reason: 'Cannot cancel because it has passed the minimum 2-hour required notice for cancellation.'
    };
  }

  return {
    allowed: true,
    hoursRemaining
  };
}

/**
 * Checks if a celebration slot (dateStr YYYY-MM-DD and timeSlot e.g. "09:30 AM")
 * has already passed relative to the current time in Asia/Kolkata (IST).
 */
export function isPastSlot(dateStr: string, timeSlotStr: string): boolean {
  if (!dateStr || !timeSlotStr) return false;
  const today = getKolkataToday();
  if (dateStr < today) return true;
  if (dateStr > today) return false;

  // When date is today: parse slot start time in IST (+05:30)
  const slotDate = parseSlotDateTime(dateStr, timeSlotStr);
  if (!slotDate) return false;

  // If slot start time has already passed
  return slotDate.getTime() <= Date.now();
}


