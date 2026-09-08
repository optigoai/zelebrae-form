import { AppConfig, BookingApiResponse, BookingState, AvailabilityResponse, ManageableBooking } from '../types/booking';
import { DEFAULT_APP_CONFIG, STANDARD_TIME_SLOTS } from '../config/constants';
import { getKolkataToday, normalizeSlotTime, isCancellationAllowed, addDays } from '../utils/dateUtils';

const API_ENDPOINT = import.meta.env.VITE_BOOKING_API_URL?.trim() || '';

// In-memory & SessionStorage Mock Store for local preview & offline resiliency
const MOCK_STORAGE_KEY = 'zelebrae_mock_bookings_v3';

interface MockBookingItem {
  id: string;
  location: string;
  date: string;
  timeSlot: string;
  name: string;
  whatsapp: string;
  status: 'confirmed' | 'cancelled';
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
  current.push(booking);
  try {
    sessionStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(current));
  } catch (e) {
    // Ignore
  }
}

export const bookingApi = {
  isOfflineMode(): boolean {
    return !API_ENDPOINT;
  },

  getApiUrl(): string {
    return API_ENDPOINT;
  },

  /**
   * Fetches dynamic configuration (locations, combos, amenities, settings)
   */
  async fetchConfig(): Promise<AppConfig> {
    if (!API_ENDPOINT) {
      // Return default config immediately
      return DEFAULT_APP_CONFIG;
    }

    try {
      const res = await fetch(`${API_ENDPOINT}?action=getConfig`, {
        method: 'GET',
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
   * Fetches available slots for a given location and date
   */
  async fetchAvailableSlots(location: string, date: string): Promise<AvailabilityResponse> {
    if (!API_ENDPOINT) {
      // Simulate network latency (250ms)
      await new Promise(r => setTimeout(r, 280));

      const booked = getStoredMockBookings().filter(
        b => b.location === location && b.date === date && b.status === 'confirmed'
      );
      const bookedTimes = new Set(booked.map(b => b.timeSlot));

      const availableSlots = STANDARD_TIME_SLOTS
        .filter(s => !bookedTimes.has(s.time))
        .map(s => s.time);

      return {
        success: true,
        location,
        date,
        availableSlots,
        allSlots: STANDARD_TIME_SLOTS.map(s => ({
          time: s.time,
          available: !bookedTimes.has(s.time)
        }))
      };
    }

    try {
      const url = `${API_ENDPOINT}?action=getAvailability&location=${encodeURIComponent(location)}&date=${encodeURIComponent(date)}&_t=${Date.now()}`;
      const res = await fetch(url);

      if (!res.ok) throw new Error(`Network response error ${res.status}`);
      const data: AvailabilityResponse = await res.json();
      if (data && Array.isArray(data.availableSlots)) {
        data.availableSlots = data.availableSlots.map(normalizeSlotTime).filter(Boolean);
      }
      return data;
    } catch (err: any) {
      console.error('Fetch availability error:', err);
      throw new Error(err.message || 'Unable to connect to booking availability server.');
    }
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
      // Prefix with single quote ' so Google Sheets treats it strictly as text literal and never parses + as formula error
      whatsapp: `'${state.countryCode} ${state.whatsapp.trim()}`,
      email: state.email.trim(),
      additional_requirements: state.additionalRequirements.trim(),
      guidelines_agreed: state.guidelinesAgreed,
      created_at: new Date().toISOString()
    };

    if (!API_ENDPOINT) {
      // Realistic simulation with server-side collision check
      await new Promise(r => setTimeout(r, 750));

      // Simulate lock & race check
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
        whatsapp: `${state.countryCode} ${state.whatsapp}`,
        status: 'confirmed'
      });

      return {
        success: true,
        bookingId,
        message: 'Booking confirmed successfully!'
      };
    }

    try {
      // Notice: We send as text/plain with JSON body to eliminate CORS preflight rejection in Google Apps Script!
      const res = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
      const data: BookingApiResponse = await res.json();
      return data;
    } catch (err: any) {
      console.error('Submit booking error:', err);
      throw new Error(err.message || 'Something went wrong while confirming your booking. Please check your connection and try again.');
    }
  },

  /**
   * Fetch all bookings associated with a specific mobile number
   */
  async fetchBookingsByPhone(phone: string): Promise<ManageableBooking[]> {
    const cleanPhone = (phone || '').replace(/\D/g, '');
    const phoneSuffix = cleanPhone.length >= 10 ? cleanPhone.slice(-10) : cleanPhone;

    if (!cleanPhone || cleanPhone.length < 5) {
      throw new Error('Please enter a valid mobile number.');
    }

    if (!API_ENDPOINT) {
      // Fallback: Read from local mock session store
      await new Promise(r => setTimeout(r, 450));
      const mockList = getStoredMockBookings();
      const matched = mockList.filter(b => {
        const itemPhone = (b.whatsapp || '').replace(/\D/g, '');
        return itemPhone.includes(phoneSuffix) || cleanPhone.includes(itemPhone.slice(-10));
      });

      return matched.map(m => ({
        bookingId: m.id,
        createdAt: new Date().toISOString(),
        location: m.location,
        date: m.date,
        timeSlot: m.timeSlot,
        name: m.name,
        whatsapp: m.whatsapp,
        occasion: 'Birthday',
        guests: 4,
        status: m.status === 'cancelled' ? 'CANCELLED' : 'CONFIRMED'
      }));
    }

    try {
      const url = `${API_ENDPOINT}?action=getBookingsByPhone&phone=${encodeURIComponent(cleanPhone)}&_t=${Date.now()}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch bookings');
      }
      return data.bookings || [];
    } catch (err: any) {
      console.error('Fetch bookings by phone error:', err);
      throw new Error(err.message || 'Could not retrieve bookings. Please check your internet connection.');
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

    if (!API_ENDPOINT) {
      // Fallback: Update mock session store
      await new Promise(r => setTimeout(r, 500));
      const mockList = getStoredMockBookings();
      const target = mockList.find(b => b.id === bookingId);
      if (target) {
        const eligibility = isCancellationAllowed(target.date, target.timeSlot);
        if (!eligibility.allowed) {
          throw new Error(eligibility.reason || 'Cannot cancel because it has passed the minimum 2-hour required notice for cancellation.');
        }
      }

      const updated = mockList.map(b => {
        if (b.id === bookingId) {
          return { ...b, status: 'cancelled' as const };
        }
        return b;
      });
      sessionStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(updated));

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
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || data.error || 'Cancellation could not be completed.');
      }

      return data;
    } catch (err: any) {
      console.error('Cancel booking error:', err);
      throw new Error(err.message || 'Failed to cancel booking. Please contact Zelebrae directly on WhatsApp.');
    }
  }
};
