import { AppConfig, BookingApiResponse, BookingState, AvailabilityResponse, ManageableBooking, EditBookingPayload, EditBookingResponse } from '../types/booking';
import { DEFAULT_APP_CONFIG, STANDARD_TIME_SLOTS } from '../config/constants';
import { getKolkataToday, normalizeSlotTime, isCancellationAllowed, addDays, isPastSlot, isPastDate } from '../utils/dateUtils';

const API_ENDPOINT = import.meta.env.VITE_BOOKING_API_URL?.trim() || '';

// In-memory & SessionStorage Mock Store for local preview & offline resiliency
const MOCK_STORAGE_KEY = 'zelebrae_mock_bookings_v3';

interface MockBookingItem {
  id: string;
  location: string;
  date: string;
  timeSlot: string;
  name: string;
  customerLocation?: string;
  whatsapp: string;
  email?: string;
  occasion?: string;
  guests?: number;
  additionalRequirements?: string;
  amenities?: string;
  combo?: string;
  status: 'confirmed' | 'cancelled';
  createdAt?: string;
}

function getStoredMockBookings(): MockBookingItem[] {
  try {
    const raw = sessionStorage.getItem(MOCK_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('SessionStorage read error:', e);
  }

  // Pre-populate some realistic booked slots for schedule display
  const today = getKolkataToday();
  const sampleBookings: MockBookingItem[] = [
    {
      id: 'ZB-BK-8581',
      location: 'pantheerankavu',
      date: addDays(today, 1),
      timeSlot: '04:30 PM',
      name: 'Customer Service',
      whatsapp: '+91 85858 55859',
      status: 'confirmed'
    },
    {
      id: 'ZB-BK-8582',
      location: 'karaparamba',
      date: today,
      timeSlot: '09:30 AM',
      name: 'Customer Service',
      whatsapp: '+91 85858 55859',
      status: 'confirmed'
    },
    {
      id: 'ZB-BK-8901',
      location: 'pantheerankavu',
      date: today,
      timeSlot: '01:30 PM',
      name: 'Priya Nair',
      whatsapp: '+91 98471 23456',
      status: 'confirmed'
    },
    {
      id: 'ZB-BK-8902',
      location: 'pantheerankavu',
      date: today,
      timeSlot: '06:30 PM',
      name: 'Arjun K',
      whatsapp: '+91 94460 98765',
      status: 'confirmed'
    },
    {
      id: 'ZB-BK-8903',
      location: 'ashokapuram',
      date: today,
      timeSlot: '02:30 PM',
      name: 'Anjali Menon',
      whatsapp: '+91 98471 11223',
      status: 'confirmed'
    },
    {
      id: 'ZB-BK-8904',
      location: 'ashokapuram',
      date: today,
      timeSlot: '07:30 PM',
      name: 'Muhammed Nihal',
      whatsapp: '+91 97450 33445',
      status: 'confirmed'
    },
    {
      id: 'ZB-BK-8905',
      location: 'karaparamba',
      date: today,
      timeSlot: '11:30 AM',
      name: 'Deepak Raj',
      whatsapp: '+91 94470 55667',
      status: 'confirmed'
    },
    {
      id: 'ZB-BK-8906',
      location: 'arakkinar',
      date: today,
      timeSlot: '04:30 PM',
      name: 'Fathima Zahra',
      whatsapp: '+91 98460 77889',
      status: 'confirmed'
    }
  ];
  try {
    sessionStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(sampleBookings));
  } catch (e) {
    // Ignore storage issues
  }
  return sampleBookings;
}

function saveMockBooking(booking: MockBookingItem) {
  const current = getStoredMockBookings();
  const index = current.findIndex(b => b.id === booking.id);
  if (index !== -1) {
    current[index] = { ...current[index], ...booking };
  } else {
    current.push(booking);
  }
  try {
    sessionStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(current));
  } catch (e) {
    // Ignore
  }
}

// ---------------------------------------------------------------------------
// High-Performance In-Memory & Session Slot Cache
// Eliminates repetitive network calls and makes date navigation instantaneous (0ms)
// ---------------------------------------------------------------------------
interface CachedSlotsEntry {
  availableSlots: string[];
  allSlots?: { time: string; available: boolean }[];
  timestamp: number;
}

const slotCache = new Map<string, CachedSlotsEntry>();
const CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutes
const REVALIDATE_AFTER_MS = 45 * 1000; // 45 seconds before background soft-revalidation
const inFlightRequests = new Map<string, Promise<AvailabilityResponse>>();
const SESSION_CACHE_PREFIX = 'zb_slots_';

function getCacheKey(location: string, date: string): string {
  return `${(location || '').toLowerCase().trim()}_${(date || '').trim()}`;
}

function getFromSessionCache(location: string, date: string): CachedSlotsEntry | null {
  try {
    const raw = sessionStorage.getItem(`${SESSION_CACHE_PREFIX}${getCacheKey(location, date)}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.timestamp > CACHE_TTL_MS) {
      sessionStorage.removeItem(`${SESSION_CACHE_PREFIX}${getCacheKey(location, date)}`);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function saveToSessionCache(location: string, date: string, entry: CachedSlotsEntry) {
  try {
    sessionStorage.setItem(`${SESSION_CACHE_PREFIX}${getCacheKey(location, date)}`, JSON.stringify(entry));
  } catch {}
}

export type SlotStatus = 'current' | 'available' | 'passed' | 'booked';

export const bookingApi = {
  isOfflineMode(): boolean {
    return !API_ENDPOINT;
  },

  getApiUrl(): string {
    return API_ENDPOINT;
  },

  /**
   * Helper to classify a slot's availability status accurately
   */
  classifySlot(
    slotTime: string,
    targetDate: string,
    availableSlots: string[],
    currentBookingSlot?: string
  ): SlotStatus {
    const norm = normalizeSlotTime(slotTime);
    if (currentBookingSlot && normalizeSlotTime(currentBookingSlot) === norm) {
      return 'current';
    }
    if (isPastSlot(targetDate, slotTime)) {
      return 'passed';
    }
    const isAvail = availableSlots.some(s => normalizeSlotTime(s) === norm);
    return isAvail ? 'available' : 'booked';
  },

  /**
   * Synchronously checks if slot availability for (location, date) is already cached in memory or session.
   * Enables 0ms instantaneous slot rendering when clicking dates!
   */
  getCachedSlots(location: string, date: string): string[] | null {
    if (!location || !date) return null;
    const key = getCacheKey(location, date);
    let entry = slotCache.get(key);
    if (!entry) {
      const sessionEntry = getFromSessionCache(location, date);
      if (sessionEntry) {
        slotCache.set(key, sessionEntry);
        entry = sessionEntry;
      }
    }
    if (!entry) return null;
    const now = Date.now();
    if (now - entry.timestamp > CACHE_TTL_MS) {
      slotCache.delete(key);
      return null;
    }
    return entry.availableSlots;
  },

  /**
   * Silently pre-fetches availability for upcoming dates in the background
   * so navigating to next days is instant. Supports batch fetching for maximum speed.
   */
  async prefetchSlots(location: string, dates: string[]): Promise<void> {
    if (!location || !Array.isArray(dates) || dates.length === 0) return;
    const now = Date.now();
    const uncachedDates = dates.filter(d => {
      if (!d || isPastDate(d)) return false;
      const key = getCacheKey(location, d);
      const cached = slotCache.get(key) || getFromSessionCache(location, d);
      if (cached && (now - cached.timestamp < REVALIDATE_AFTER_MS)) {
        if (!slotCache.has(key)) slotCache.set(key, cached);
        return false; // Already cached and fresh
      }
      if (inFlightRequests.has(key)) return false;
      return true;
    });

    if (uncachedDates.length === 0) return;

    // High-speed batch query if multiple dates requested and endpoint is live
    if (API_ENDPOINT && uncachedDates.length > 1) {
      try {
        const url = `${API_ENDPOINT}?action=getAvailabilityBatch&location=${encodeURIComponent(location)}&dates=${encodeURIComponent(uncachedDates.join(','))}&_t=${Date.now()}`;
        const res = await fetch(url, {
          method: 'GET',
          redirect: 'follow',
          credentials: 'omit',
          cache: 'no-store',
          headers: { 'Accept': 'application/json' }
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.success && data.dates) {
            Object.entries(data.dates).forEach(([d, slots]: [string, any]) => {
              if (Array.isArray(slots)) {
                const normSlots = slots.map(normalizeSlotTime).filter(s => Boolean(s) && !isPastSlot(d, s));
                const entry: CachedSlotsEntry = {
                  availableSlots: normSlots,
                  timestamp: Date.now()
                };
                slotCache.set(getCacheKey(location, d), entry);
                saveToSessionCache(location, d, entry);
              }
            });
            return;
          }
        }
      } catch {
        // Fallback to individual calls below
      }
    }

    // Individual pre-fetches
    uncachedDates.forEach(d => {
      this.fetchAvailableSlots(location, d).catch(() => {});
    });
  },

  /**
   * Invalidates slot cache for a location and date (used after booking, cancelling or editing)
   */
  invalidateSlotCache(location?: string, date?: string): void {
    if (location && date) {
      const key = getCacheKey(location, date);
      slotCache.delete(key);
      try {
        sessionStorage.removeItem(`${SESSION_CACHE_PREFIX}${key}`);
      } catch {}
    } else if (location) {
      const prefix = `${location.toLowerCase().trim()}_`;
      for (const k of slotCache.keys()) {
        if (k.startsWith(prefix)) slotCache.delete(k);
      }
      try {
        for (let i = sessionStorage.length - 1; i >= 0; i--) {
          const k = sessionStorage.key(i);
          if (k && k.startsWith(`${SESSION_CACHE_PREFIX}${prefix}`)) {
            sessionStorage.removeItem(k);
          }
        }
      } catch {}
    } else {
      slotCache.clear();
      try {
        for (let i = sessionStorage.length - 1; i >= 0; i--) {
          const k = sessionStorage.key(i);
          if (k && k.startsWith(SESSION_CACHE_PREFIX)) {
            sessionStorage.removeItem(k);
          }
        }
      } catch {}
    }
  },

  /**
   * Fetches dynamic configuration (locations, combos, amenities, settings)
   */
  async fetchConfig(): Promise<AppConfig> {
    if (!API_ENDPOINT) {
      return DEFAULT_APP_CONFIG;
    }

    try {
      const res = await fetch(`${API_ENDPOINT}?action=getConfig`, {
        method: 'GET',
        redirect: 'follow',
        credentials: 'omit',
        cache: 'no-store',
        headers: { 'Accept': 'application/json' }
      });
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const data = await res.json();
      if (data.success && data.config) {
        return {
          ...DEFAULT_APP_CONFIG,
          ...data.config
        };
      }
      return DEFAULT_APP_CONFIG;
    } catch (err) {
      console.warn('Failed to fetch remote config, using defaults:', err);
      return DEFAULT_APP_CONFIG;
    }
  },

  /**
   * Fetches available slots for a given location and date with instant caching & request deduplication
   */
  async fetchAvailableSlots(location: string, date: string, forceRefresh = false): Promise<AvailabilityResponse> {
    const key = getCacheKey(location, date);
    const now = Date.now();
    const cached = slotCache.get(key);

    // 1. Return immediately from cache if available and fresh
    if (!forceRefresh && cached && (now - cached.timestamp < CACHE_TTL_MS)) {
      // Soft background revalidation if data is older than REVALIDATE_AFTER_MS
      if (now - cached.timestamp > REVALIDATE_AFTER_MS && !inFlightRequests.has(key)) {
        this.fetchAvailableSlots(location, date, true).catch(() => {});
      }
      return {
        success: true,
        location,
        date,
        availableSlots: cached.availableSlots,
        allSlots: cached.allSlots
      };
    }

    // 2. Request deduplication: reuse in-flight promise if currently fetching
    if (inFlightRequests.has(key)) {
      return inFlightRequests.get(key)!;
    }

    // 3. Initiate fetch promise
    const fetchPromise = (async () => {
      try {
        if (!API_ENDPOINT) {
          await new Promise(r => setTimeout(r, 180));

          const booked = getStoredMockBookings().filter(
            b => b.location === location && b.date === date && b.status === 'confirmed'
          );
          const bookedTimes = new Set(booked.map(b => b.timeSlot));

          const availableSlots = STANDARD_TIME_SLOTS
            .filter(s => !bookedTimes.has(s.time) && !isPastSlot(date, s.time))
            .map(s => s.time);

          const result: AvailabilityResponse = {
            success: true,
            location,
            date,
            availableSlots,
            allSlots: STANDARD_TIME_SLOTS.map(s => ({
              time: s.time,
              available: !bookedTimes.has(s.time) && !isPastSlot(date, s.time)
            }))
          };

          slotCache.set(key, {
            availableSlots: result.availableSlots,
            allSlots: result.allSlots,
            timestamp: Date.now()
          });

          return result;
        }

        const url = `${API_ENDPOINT}?action=getAvailability&location=${encodeURIComponent(location)}&date=${encodeURIComponent(date)}&_t=${Date.now()}`;
        const res = await fetch(url, {
          method: 'GET',
          redirect: 'follow',
          credentials: 'omit',
          cache: 'no-store',
          headers: { 'Accept': 'application/json' }
        });

        if (!res.ok) throw new Error(`Network response error ${res.status}`);
        const data: AvailabilityResponse = await res.json();
        if (data && Array.isArray(data.availableSlots)) {
          data.availableSlots = data.availableSlots
            .map(normalizeSlotTime)
            .filter(slot => Boolean(slot) && !isPastSlot(date, slot));
        }

        const slotEntry: CachedSlotsEntry = {
          availableSlots: data.availableSlots || [],
          allSlots: data.allSlots,
          timestamp: Date.now()
        };
        slotCache.set(key, slotEntry);
        saveToSessionCache(location, date, slotEntry);

        return data;
      } catch (err: any) {
        console.error('Fetch availability error:', err);
        // Fallback to cached if available
        if (cached) {
          return {
            success: true,
            location,
            date,
            availableSlots: cached.availableSlots,
            allSlots: cached.allSlots
          };
        }
        throw new Error(err.message || 'Unable to connect to booking availability server.');
      } finally {
        inFlightRequests.delete(key);
      }
    })();

    inFlightRequests.set(key, fetchPromise);
    return fetchPromise;
  },

  /**
   * Submits reservation to Google Apps Script Web App
   */
  async submitBooking(state: BookingState): Promise<BookingApiResponse> {
    const payload = {
      action: 'createBooking',
      location: state.location,
      occasion: state.occasion === 'other' && state.customOccasion ? state.customOccasion : state.occasion,
      guests: state.guests,
      date: state.date,
      time_slot: `'${state.timeSlot}`,
      amenities: state.amenities.join(', '),
      combo: state.combo === 'none' 
        ? 'None' 
        : (state.comboPackage 
            ? `${state.combo} (${state.comboPackage} - ₹${state.comboPrice})` 
            : state.combo),
      name: state.name.trim(),
      customer_location: state.customerLocation.trim(),
      whatsapp: `'${state.countryCode} ${state.whatsapp.trim()}`,
      email: state.email.trim(),
      additional_requirements: state.additionalRequirements.trim(),
      payment_screenshot_base64: state.paymentScreenshot || '',
      payment_screenshot_name: state.paymentScreenshotName || '',
      guidelines_agreed: state.guidelinesAgreed,
      created_at: new Date().toISOString()
    };

    if (!API_ENDPOINT) {
      await new Promise(r => setTimeout(r, 650));

      if (isPastSlot(state.date, state.timeSlot)) {
        return {
          success: false,
          error: 'SLOT_TIME_PASSED',
          message: 'This celebration time slot has already passed. Please select an upcoming time.'
        };
      }

      const currentBookings = getStoredMockBookings();
      const collision = currentBookings.find(
        b => b.location === state.location && b.date === state.date && b.timeSlot === state.timeSlot && b.status === 'confirmed'
      );

      if (collision) {
        return {
          success: false,
          error: 'SLOT_ALREADY_BOOKED',
          message: 'Sorry, that slot was just booked by someone else. Please choose another time.'
        };
      }

      const randomNum = Math.floor(100 + Math.random() * 900);
      const cleanDate = state.date.replace(/-/g, '');
      const bookingId = `ZB-${cleanDate}-${randomNum}`;

      saveMockBooking({
        id: bookingId,
        location: state.location,
        date: state.date,
        timeSlot: state.timeSlot,
        name: state.name,
        customerLocation: state.customerLocation,
        whatsapp: `${state.countryCode} ${state.whatsapp}`,
        email: state.email,
        occasion: state.occasion,
        guests: state.guests,
        additionalRequirements: state.additionalRequirements,
        amenities: state.amenities.join(', '),
        combo: state.combo,
        status: 'confirmed',
        createdAt: new Date().toISOString()
      });

      this.invalidateSlotCache(state.location, state.date);

      return {
        success: true,
        bookingId,
        message: 'Booking confirmed successfully!'
      };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000);

    try {
      const res = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        credentials: 'omit',
        redirect: 'follow',
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
      const data: BookingApiResponse = await res.json();

      if (data.success && data.bookingId) {
        // Record in session store for immediate lookup & fallback
        saveMockBooking({
          id: data.bookingId,
          location: state.location,
          date: state.date,
          timeSlot: state.timeSlot,
          name: state.name.trim(),
          customerLocation: state.customerLocation.trim(),
          whatsapp: `${state.countryCode} ${state.whatsapp.trim()}`,
          email: state.email.trim(),
          occasion: state.occasion,
          guests: state.guests,
          additionalRequirements: state.additionalRequirements.trim(),
          amenities: state.amenities.join(', '),
          combo: state.combo,
          status: 'confirmed',
          createdAt: new Date().toISOString()
        });

        this.invalidateSlotCache(state.location, state.date);
      }

      return data;
    } catch (err: any) {
      clearTimeout(timeoutId);
      console.error('Submit booking error:', err);
      if (err.name === 'AbortError') {
        throw new Error('Confirmation took longer than expected. Please check your internet connection or WhatsApp us directly.');
      }
      throw new Error(err.message || 'Something went wrong while confirming your booking. Please check your connection and try again.');
    }
  },

  /**
   * Fetch all bookings associated with a specific mobile number.
   * Handles 404, redirects and network dropouts gracefully by merging with session storage.
   */
  async fetchBookingsByPhone(phone: string): Promise<ManageableBooking[]> {
    const cleanPhone = (phone || '').replace(/\D/g, '');
    const phoneSuffix = cleanPhone.length >= 10 ? cleanPhone.slice(-10) : cleanPhone;

    if (!cleanPhone || cleanPhone.length < 5) {
      throw new Error('Please enter a valid mobile number.');
    }

    // 1. Gather any matching local session bookings
    const localList = getStoredMockBookings();
    const localMatches: ManageableBooking[] = localList
      .filter(b => {
        const itemPhone = (b.whatsapp || '').replace(/\D/g, '');
        const itemSuffix = itemPhone.length >= 10 ? itemPhone.slice(-10) : itemPhone;
        return itemSuffix === phoneSuffix || itemPhone.includes(phoneSuffix) || cleanPhone.includes(itemSuffix);
      })
      .map(m => ({
        bookingId: m.id,
        createdAt: m.createdAt || new Date().toISOString(),
        location: m.location,
        date: m.date,
        timeSlot: m.timeSlot,
        name: m.name,
        customerLocation: m.customerLocation,
        whatsapp: m.whatsapp,
        email: m.email,
        occasion: m.occasion || 'Celebration',
        guests: m.guests || 4,
        additionalRequirements: m.additionalRequirements,
        amenities: m.amenities,
        combo: m.combo,
        status: m.status === 'cancelled' ? 'CANCELLED' : 'CONFIRMED'
      }));

    if (!API_ENDPOINT) {
      await new Promise(r => setTimeout(r, 350));
      return localMatches;
    }

    // 2. Fetch from Google Apps Script Web App
    try {
      const url = `${API_ENDPOINT}?action=getBookingsByPhone&phone=${encodeURIComponent(cleanPhone)}&_t=${Date.now()}`;
      const res = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        credentials: 'omit',
        cache: 'no-store',
        headers: { 'Accept': 'application/json' }
      });

      if (!res.ok) {
        console.warn(`Remote booking fetch returned HTTP ${res.status}. Falling back to local storage.`);
        return localMatches;
      }

      const data = await res.json();
      if (!data.success) {
        console.warn('Remote booking search returned unsuccessful:', data.error);
        return localMatches;
      }

      const remoteBookings: ManageableBooking[] = data.bookings || [];

      // Merge remote & local records, deduplicating by bookingId (prefer remote status)
      const mergedMap = new Map<string, ManageableBooking>();
      localMatches.forEach(b => mergedMap.set(b.bookingId, b));
      remoteBookings.forEach(b => mergedMap.set(b.bookingId, b));

      return Array.from(mergedMap.values()).sort((a, b) => {
        return (b.date || '').localeCompare(a.date || '');
      });
    } catch (err: any) {
      console.warn('Fetch bookings network glitch, using local records:', err);
      if (localMatches.length > 0) {
        return localMatches;
      }
      throw new Error('Unable to connect to booking records. Please check your internet connection or try again.');
    }
  },

  /**
   * Edit / Reschedule an active booking
   */
  async editBooking(payload: EditBookingPayload): Promise<EditBookingResponse> {
    const { bookingId, phone, location, date, timeSlot, guests, occasion, additionalRequirements } = payload;
    const cleanPhone = (phone || '').replace(/\D/g, '');

    if (!bookingId || !cleanPhone) {
      throw new Error('Booking ID and registered mobile number are required to edit.');
    }

    // Update local session store for instant synchronization
    const localList = getStoredMockBookings();
    const target = localList.find(b => b.id === bookingId);
    let oldLocation = '';
    let oldDate = '';

    if (target) {
      oldLocation = target.location;
      oldDate = target.date;
      if (date && timeSlot && (date !== target.date || timeSlot !== target.timeSlot || (location && location !== target.location))) {
        const eligibility = isCancellationAllowed(target.date, target.timeSlot);
        if (!eligibility.allowed) {
          throw new Error(eligibility.reason || 'Cannot reschedule because it has passed the required advance notice for this slot.');
        }
      }
      if (location) target.location = location;
      if (date) target.date = date;
      if (timeSlot) target.timeSlot = timeSlot;
      if (guests) target.guests = guests;
      if (occasion) target.occasion = occasion;
      if (additionalRequirements !== undefined) target.additionalRequirements = additionalRequirements;
      sessionStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(localList));
    }

    const finalLocation = location || oldLocation;

    if (!API_ENDPOINT) {
      await new Promise(r => setTimeout(r, 450));
      if (oldLocation && oldDate) this.invalidateSlotCache(oldLocation, oldDate);
      if (finalLocation && (oldDate || date)) {
        this.invalidateSlotCache(finalLocation, oldDate);
        if (date) this.invalidateSlotCache(finalLocation, date);
      }
      return {
        success: true,
        bookingId,
        message: 'Your celebration booking has been successfully updated!'
      };
    }

    try {
      const res = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        credentials: 'omit',
        redirect: 'follow',
        body: JSON.stringify({
          action: 'editBooking',
          bookingId,
          phone: cleanPhone,
          location: finalLocation,
          date,
          time_slot: timeSlot ? `'${timeSlot}` : undefined,
          timeSlot,
          guests,
          occasion,
          additional_requirements: additionalRequirements
        })
      });

      if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || data.error || 'Failed to update booking.');
      }

      if (oldLocation && oldDate) this.invalidateSlotCache(oldLocation, oldDate);
      if (finalLocation && (oldDate || date)) {
        this.invalidateSlotCache(finalLocation, oldDate);
        if (date) this.invalidateSlotCache(finalLocation, date);
      }

      return {
        success: true,
        bookingId,
        message: data.message || 'Celebration booking successfully updated!'
      };
    } catch (err: any) {
      console.error('Edit booking error:', err);
      throw new Error(err.message || 'Failed to update booking. Please contact Zelebrae directly on WhatsApp.');
    }
  },

  /**
   * Cancel an active booking
   */
  async cancelBooking(bookingId: string, phone: string): Promise<{ success: boolean; message: string; bookingId?: string }> {
    const cleanPhone = (phone || '').replace(/\D/g, '');

    if (!bookingId || !cleanPhone) {
      throw new Error('Booking ID and mobile number are required to cancel.');
    }

    // Invalidate local cache and update session store
    const localList = getStoredMockBookings();
    const target = localList.find(b => b.id === bookingId);
    let targetLoc = '';
    let targetDate = '';

    if (target) {
      targetLoc = target.location;
      targetDate = target.date;
      const eligibility = isCancellationAllowed(target.date, target.timeSlot);
      if (!eligibility.allowed) {
        throw new Error(eligibility.reason || 'Cannot cancel because it has passed the minimum 2-hour required notice for cancellation.');
      }
      target.status = 'cancelled';
      sessionStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(localList));
    }

    if (!API_ENDPOINT) {
      await new Promise(r => setTimeout(r, 450));
      if (targetLoc && targetDate) {
        this.invalidateSlotCache(targetLoc, targetDate);
      }
      return {
        success: true,
        bookingId,
        message: 'Your celebration booking has been successfully cancelled. The slot has been released.'
      };
    }

    try {
      const payload = {
        action: 'cancelBooking',
        bookingId,
        phone: cleanPhone
      };

      const res = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        credentials: 'omit',
        redirect: 'follow',
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || data.error || 'Cancellation could not be completed.');
      }

      if (targetLoc && targetDate) {
        this.invalidateSlotCache(targetLoc, targetDate);
      }

      return data;
    } catch (err: any) {
      console.error('Cancel booking error:', err);
      throw new Error(err.message || 'Failed to cancel booking. Please contact Zelebrae directly on WhatsApp.');
    }
  }
};
