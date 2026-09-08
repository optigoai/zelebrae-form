export interface CelebrationLocation {
  id: string;
  name: string;
  tagline: string;
  address: string;
  image: string;
  maxCapacity: number;
  active: boolean;
  features: string[];
}

export interface Occasion {
  id: string;
  name: string;
  icon: string;
  description: string;
  popular?: boolean;
}

export interface Amenity {
  id: string;
  name: string;
  icon: string;
  description: string;
  isComplimentary: boolean;
  price?: number;
  active: boolean;
}

export interface ComboOption {
  code: string;
  price: number;
  label: string;
  image?: string;
}

export interface ComboItem {
  id: string;
  name: string;
  category: string;
  description: string;
  price: number;
  driveUrl?: string;
  image?: string;
  options?: ComboOption[];
  includes: string[];
  popular?: boolean;
  active: boolean;
}

export interface TimeSlot {
  time: string;
  endTime: string;
  period: 'morning' | 'afternoon' | 'evening';
  available: boolean;
}

export interface BookingState {
  location: string;
  occasion: string;
  customOccasion?: string;
  guests: number;
  date: string; // YYYY-MM-DD in Asia/Kolkata
  timeSlot: string; // e.g. "4:00 PM"
  amenities: string[]; // IDs
  combo: string; // Combo ID or 'none'
  comboPackage?: string; // e.g. 'DC1'
  comboPrice?: number; // e.g. 350
  name: string;
  customerLocation: string;
  countryCode: string; // e.g. "+91"
  whatsapp: string;
  email: string;
  additionalRequirements: string;
  guidelinesAgreed: boolean;
}

export interface BookingApiResponse {
  success: boolean;
  bookingId?: string;
  error?: string;
  message?: string;
  data?: any;
}

export interface AvailabilityResponse {
  success: boolean;
  location: string;
  date: string;
  availableSlots: string[];
  allSlots?: { time: string; available: boolean }[];
  error?: string;
}

export interface AppConfig {
  locations: CelebrationLocation[];
  occasions: Occasion[];
  amenities: Amenity[];
  combos: ComboItem[];
  maxGuests: number;
  minGuests: number;
  whatsappNumber: string; // e.g. "918585855859"
  bookingWindowDays: number;
  menuPdfUrl?: string;
}

export interface ManageableBooking {
  bookingId: string;
  createdAt?: string;
  location: string;
  date: string;
  timeSlot: string;
  name: string;
  customerLocation?: string;
  whatsapp: string;
  email?: string;
  occasion: string;
  guests: number;
  additionalRequirements?: string;
  amenities?: string;
  combo?: string;
  status: 'CONFIRMED' | 'CANCELLED' | string;
}
