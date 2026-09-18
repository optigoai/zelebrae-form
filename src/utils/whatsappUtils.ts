import { BookingState, CelebrationLocation, Occasion, Amenity, ComboItem } from '../types/booking';

/**
 * Official WhatsApp phone numbers for each celebration location
 */
export const BRANCH_WHATSAPP_NUMBERS: Record<string, string> = {
  karaparamba: '918585851285',
  pantheerankavu: '918585855859',
  arakkinar: '918585850859',
  ashokapuram: '918585853852'
};

/**
 * Returns the 12-digit international WhatsApp number (e.g. 918585851285)
 * matching the given location ID or name.
 */
export function getBranchWhatsAppNumber(locationId?: string): string {
  const norm = (locationId || '').toLowerCase().trim();
  for (const [key, num] of Object.entries(BRANCH_WHATSAPP_NUMBERS)) {
    if (norm.includes(key) || key.includes(norm)) {
      return num;
    }
  }
  // Default to Pantheerankavu if unrecognized
  return '918585855859';
}

/**
 * Formats the number for UI display: +91 85858 51285
 */
export function formatBranchWhatsAppNumber(locationId?: string): string {
  const raw = getBranchWhatsAppNumber(locationId);
  if (raw.length === 12 && raw.startsWith('91')) {
    return `+91 ${raw.slice(2, 7)} ${raw.slice(7)}`;
  }
  return `+${raw}`;
}

/**
 * Formats date from YYYY-MM-DD to DD-MM-YYYY
 */
export function formatWhatsAppDate(dateStr?: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const [year, month, day] = parts;
    return `${day}-${month}-${year}`;
  }
  return dateStr;
}

/**
 * Prettifies occasion ID into title-cased display name
 */
function getDisplayOccasion(
  occasionId: string, 
  customOccasion?: string, 
  occasions?: Occasion[]
): string {
  if (occasionId === 'other' && customOccasion?.trim()) {
    return customOccasion.trim();
  }
  if (occasions && occasions.length > 0) {
    const found = occasions.find(o => o.id === occasionId);
    if (found?.name) return found.name;
  }
  const map: Record<string, string> = {
    birthday: 'Birthday',
    anniversary: 'Anniversary',
    bride_to_be: 'Bride to Be',
    groom_to_be: 'Groom to Be',
    mom_to_be: 'Mom to Be',
    other: 'Celebration'
  };
  return map[occasionId] || occasionId.charAt(0).toUpperCase() + occasionId.slice(1);
}

/**
 * Prettifies combo ID into clean display name
 */
function getDisplayComboName(comboId: string, combos?: ComboItem[]): string {
  if (!comboId || comboId === 'none') return 'None';
  if (combos && combos.length > 0) {
    const found = combos.find(c => c.id === comboId);
    if (found?.name) return found.name;
  }
  const map: Record<string, string> = {
    birthday_combo: 'Birthday Combo',
    anniversary_combo: 'Anniversary Combo',
    bride_to_be_combo: 'Bride to Be Combo',
    groom_to_be_combo: 'Groom to Be Combo',
    mom_to_be_combo: 'Mom to Be Combo'
  };
  return map[comboId] || 'Party Combo';
}

/**
 * Builds the official WhatsApp booking message formatted exactly to specifications:
 *
 * *Celebration Point Booking*
 * *Response* #{{bookingId}}
 *
 * ────────────────
 *
 * *Reserve Your Sweet moment 🎉*
 *
 * *Where do you want to Celebrate? :* {{Location}}
 * *Full Name :* {{Name}}
 * *Your Location :* {{Location}}
 * *Whatsapp Number :* {{Phone}}
 * *Enter your email :* {{Email}}
 * *Choose your Occasion :* {{Occasion}}
 * *Number of Guests :* {{Guests}}
 * *Choose date  :* {{Date}}
 * *Time Slot :* {{Time}}
 * *Amenities :* {{Amenities}}
 * *Chargeable Party Accessories :* {{Combo}}
 *
 * *We Can't wait to host you ! 💜*
 *
 *
 * ────────────────
 * *Select  {{Combo}}  :* {{Option}}    ₹{{Price}}/-
 * *Have you read and agreed to follow the Celebration Area Guidelines and Policies.? :* Yes, I agree
 */
export function buildWhatsAppBookingMessage(
  bookingId: string,
  state: BookingState,
  locations?: CelebrationLocation[],
  occasions?: Occasion[],
  amenitiesList?: Amenity[],
  combosList?: ComboItem[]
): string {
  // 1. Resolve Location Name
  const loc = locations?.find(l => l.id === state.location);
  const locationName = loc?.name || (state.location ? state.location.charAt(0).toUpperCase() + state.location.slice(1) : 'Karaparamba');

  // 2. Resolve Customer Phone (clean digits with country code)
  const cc = (state.countryCode || '91').replace(/\D/g, '') || '91';
  const rawNum = state.whatsapp.replace(/\D/g, '');
  const customerPhone = rawNum.startsWith(cc) ? rawNum : `${cc}${rawNum}`;

  // 3. Resolve Date & Time
  const dateFormatted = formatWhatsAppDate(state.date);
  // Format 07:30 PM -> 07.30 PM
  const timeSlotFormatted = (state.timeSlot || '').replace(':', '.');

  // 4. Resolve Occasion
  const occasionName = getDisplayOccasion(state.occasion, state.customOccasion, occasions);

  // 5. Resolve Amenities
  const AMENITY_NAME_MAP: Record<string, string> = {
    basic_decorations: 'Basic Decorations',
    music_mic: 'Background Music & Mic',
    ac_hall: 'AC Hall',
    welcome_drink: 'Welcome Drink'
  };

  let amenitiesString = 'None';
  if (state.amenities && state.amenities.length > 0) {
    const names = state.amenities.map(id => {
      const found = amenitiesList?.find(a => a.id === id);
      return found?.name || AMENITY_NAME_MAP[id] || id;
    });
    amenitiesString = names.join(', ');
  }

  // 6. Resolve Combo & Party Accessories
  const hasCombo = Boolean(state.combo && state.combo !== 'none');
  const comboName = hasCombo ? getDisplayComboName(state.combo, combosList) : 'None';

  let comboSelectionLine = '*Select  Party Accessories  :* None';
  if (hasCombo) {
    const pkg = state.comboPackage || 'Selected';
    const price = state.comboPrice || 0;
    // Format "Birthday Combo" -> "Birthday combo" as in user example
    const comboTag = comboName.replace(/\bCombo\b/i, 'combo');
    comboSelectionLine = `*Select  ${comboTag}  :* ${pkg}    ₹${price}/-`;
  }

  // 7. Clean Response ID
  const displayId = bookingId.startsWith('#') ? bookingId : `#${bookingId}`;

  // Assemble full message
  const lines = [
    '*Celebration Point Booking*',
    `*Response* ${displayId}`,
    '',
    '────────────────',
    '',
    '*Reserve Your Sweet moment 🎉*',
    '',
    `*Where do you want to Celebrate? :* ${locationName}`,
    `*Full Name :* ${state.name || ''}`,
    `*Your Location :* ${state.customerLocation || ''}`,
    `*Whatsapp Number :* ${customerPhone}`,
    `*Enter your email :* ${state.email || 'N/A'}`,
    `*Choose your Occasion :* ${occasionName}`,
    `*Number of Guests :* ${state.guests || 1}`,
    `*Choose date  :* ${dateFormatted}`,
    `*Time Slot :* ${timeSlotFormatted}`,
    `*Amenities :* ${amenitiesString}`,
    `*Chargeable Party Accessories :* ${comboName}`,
    ...(state.additionalRequirements?.trim() 
      ? [`*Additional Notes :* ${state.additionalRequirements.trim()}`] 
      : []),
    '',
    "*We Can't wait to host you ! 💜*",
    '',
    '',
    '────────────────',
    comboSelectionLine,
    '*Have you read and agreed to follow the Celebration Area Guidelines and Policies.? :* Yes, I agree'
  ];

  return lines.join('\n');
}

/**
 * Builds WhatsApp message for rescheduled or updated celebration bookings
 */
export function buildWhatsAppRescheduleMessage(booking: {
  bookingId: string;
  location: string;
  name: string;
  date: string;
  timeSlot: string;
  guests: number;
  occasion: string;
  notes?: string;
}): string {
  const formattedDate = formatWhatsAppDate(booking.date);
  const lines = [
    '*Celebration Booking Updated / Rescheduled 📝*',
    `*Booking ID:* ${booking.bookingId}`,
    '────────────────',
    `*Location:* ${booking.location}`,
    `*Guest Name:* ${booking.name || ''}`,
    `*Occasion:* ${booking.occasion}`,
    `*Guests:* ${booking.guests}`,
    `*New Date:* ${formattedDate}`,
    `*New Time Slot:* ${booking.timeSlot}`,
    ...(booking.notes?.trim() ? [`*Special Notes:* ${booking.notes.trim()}`] : []),
    '────────────────',
    'Please confirm our updated reservation. Looking forward to our celebration! 💜'
  ];

  return lines.join('\n');
}

/**
 * Opens WhatsApp chat safely across both desktop and mobile devices.
 */
export function openWhatsAppChat(url: string): void {
  try {
    const newWindow = window.open(url, '_blank');
    if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
      window.location.href = url;
    }
  } catch {
    window.location.href = url;
  }
}

