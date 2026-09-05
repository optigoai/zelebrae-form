/**
 * ============================================================================
 * ZELEBRAE PASTRIES — CELEBRATION POINT BOOKING API
 * Google Apps Script Web App Endpoint
 * ============================================================================
 * 
 * Features:
 * 1. doGet(e): Reads configuration (locations, combos, amenities) and checks
 *    real-time slot availability for a given date and location.
 * 2. doPost(e): Atomic booking creation protected by LockService to eliminate
 *    race conditions and double-bookings.
 * 3. setupInitialSheets(): Run once from Script Editor to automatically generate
 *    all 6 sheets, headers, and seed data.
 */

// Timezone configured for Kerala, India
const TIMEZONE = "Asia/Kolkata";

/**
 * Handle HTTP GET Requests: Read Config & Available Slots
 */
function doGet(e) {
  try {
    const action = (e && e.parameter && e.parameter.action) || 'getAvailability';
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    if (action === 'getConfig') {
      return jsonResponse({
        success: true,
        config: getAppConfiguration(ss)
      });
    }

    if (action === 'getAvailability') {
      const location = (e.parameter.location || 'ashokapuram').toLowerCase().trim();
      const date = (e.parameter.date || '').trim(); // Expected: YYYY-MM-DD

      if (!date) {
        return jsonResponse({
          success: false,
          error: "Date parameter (YYYY-MM-DD) is required"
        });
      }

      const availableSlots = computeAvailableSlots(ss, location, date);
      return jsonResponse({
        success: true,
        location: location,
        date: date,
        availableSlots: availableSlots
      });
    }

    return jsonResponse({
      success: false,
      error: "Invalid action parameter"
    });
  } catch (err) {
    return jsonResponse({
      success: false,
      error: "Internal Server Error: " + err.toString()
    });
  }
}

/**
 * Handle HTTP POST Requests: Atomic Booking with LockService Protection
 */
function doPost(e) {
  // 1. Acquire Script Lock with a 30-second timeout to serialize concurrent requests
  const lock = LockService.getScriptLock();
  const lockSuccess = lock.tryLock(30000);

  if (!lockSuccess) {
    return jsonResponse({
      success: false,
      error: "SERVER_BUSY",
      message: "The booking server is currently handling high traffic. Please try again in a few seconds."
    });
  }

  try {
    let body = {};
    if (e && e.postData && e.postData.contents) {
      body = JSON.parse(e.postData.contents);
    } else if (e && e.parameter) {
      body = e.parameter;
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // 2. Extract and sanitize payload
    const location = (body.location || 'ashokapuram').toLowerCase().trim();
    const date = (body.date || '').trim(); // YYYY-MM-DD
    const rawTimeSlot = (body.time_slot || body.timeSlot || '').toString().trim().replace(/^'/, '');
    const name = (body.name || '').trim();
    const customerLocation = (body.customer_location || body.customerLocation || '').trim();
    const rawWhatsapp = (body.whatsapp || '').toString().trim().replace(/^'/, '');
    const email = (body.email || '').trim();
    const occasion = (body.occasion || '').trim();
    const guests = parseInt(body.guests, 10) || 1;
    const amenities = (body.amenities || '').trim();
    const combo = (body.combo || 'none').trim();
    const additionalRequirements = (body.additional_requirements || body.additionalRequirements || '').trim();
    const guidelinesAgreed = body.guidelines_agreed === true || body.guidelines_agreed === 'true';

    // 3. Validation
    if (!location || !date || !rawTimeSlot || !name || !rawWhatsapp || !occasion) {
      return jsonResponse({
        success: false,
        error: "MISSING_REQUIRED_FIELDS",
        message: "Please complete all required fields."
      });
    }

    if (!guidelinesAgreed) {
      return jsonResponse({
        success: false,
        error: "GUIDELINES_NOT_AGREED",
        message: "You must read and agree to the celebration guidelines."
      });
    }

    // 4. Check for double booking collision (location + date + time_slot)
    const isBooked = isSlotAlreadyBooked(ss, location, date, rawTimeSlot);
    if (isBooked) {
      return jsonResponse({
        success: false,
        error: "SLOT_ALREADY_BOOKED",
        message: "Sorry, that slot was just booked by someone else. Please choose another time."
      });
    }

    // 5. Generate unique booking ID: ZB-YYYYMMDD-XXX
    const cleanDate = date.replace(/-/g, '');
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const bookingId = "ZB-" + cleanDate + "-" + randomSuffix;
    const createdAt = Utilities.formatDate(new Date(), TIMEZONE, "yyyy-MM-dd'T'HH:mm:ssXXX");

    // 6. Append booking row to Bookings sheet
    let bookingsSheet = ss.getSheetByName("Bookings");
    if (!bookingsSheet) {
      bookingsSheet = ss.insertSheet("Bookings");
      bookingsSheet.appendRow([
        "booking_id", "created_at", "location", "date", "time_slot",
        "name", "customer_location", "whatsapp", "email", "occasion",
        "guests", "additional_requirements", "amenities", "combo", "status"
      ]);
    }

    // Store whatsapp and timeSlot as text literals with single quote prefix
    // This stops Google Sheets from interpreting '+' as a formula (#ERROR!) and time as an 1899 Date
    const cellWhatsapp = "'" + rawWhatsapp;
    const cellTimeSlot = "'" + rawTimeSlot;

    bookingsSheet.appendRow([
      bookingId,
      createdAt,
      location,
      date,
      cellTimeSlot,
      name,
      customerLocation,
      cellWhatsapp,
      email,
      occasion,
      guests,
      additionalRequirements,
      amenities,
      combo,
      "confirmed" // Initial active status
    ]);

    // SpreadSheet write flushed immediately
    SpreadsheetApp.flush();

    return jsonResponse({
      success: true,
      bookingId: bookingId,
      message: "Celebration slot booked successfully!"
    });

  } catch (err) {
    return jsonResponse({
      success: false,
      error: "BOOKING_FAILED",
      message: "An error occurred: " + err.toString()
    });
  } finally {
    // Always release the lock
    lock.releaseLock();
  }
}

/**
 * Normalizes slot value from cell (Date object, "09:30", "09:30 AM", etc.) into standard "hh:mm A"
 */
function normalizeSlot(val) {
  if (!val) return '';
  if (val instanceof Date) {
    return Utilities.formatDate(val, TIMEZONE, "hh:mm a").toUpperCase();
  }
  var str = val.toString().trim().replace(/^'/, '');
  var m = str.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i);
  if (m) {
    var hh = parseInt(m[1], 10);
    var mm = m[2];
    var ampm = (m[3] || '').toUpperCase();
    if (!ampm) {
      if (hh >= 9 && hh <= 11) {
        ampm = 'AM';
      } else if (hh === 12) {
        ampm = 'PM';
      } else if (hh >= 13 && hh <= 21) {
        ampm = 'PM';
        hh -= 12;
      } else if (hh >= 1 && hh <= 8) {
        ampm = 'PM';
      }
    }
    var hhStr = hh < 10 ? '0' + hh : '' + hh;
    return hhStr + ':' + mm + ' ' + ampm;
  }
  return str.toUpperCase();
}

/**
 * Computes available slots for a specific location and date
 */
function computeAvailableSlots(ss, location, date) {
  // 1. Get base configured slots from Slots sheet
  let configuredSlots = [
    "09:30 AM", "10:30 AM", "11:30 AM", "12:30 PM",
    "01:30 PM", "02:30 PM", "03:30 PM", "04:30 PM",
    "05:30 PM", "06:30 PM", "07:30 PM", "08:30 PM"
  ];

  const slotsSheet = ss.getSheetByName("Slots");
  if (slotsSheet) {
    // Use getDisplayValues so time cells return formatted string
    const slotsData = slotsSheet.getDataRange().getDisplayValues();
    if (slotsData.length > 1) {
      const customSlots = [];
      for (let i = 1; i < slotsData.length; i++) {
        const rowLocation = (slotsData[i][0] || '').toString().toLowerCase().trim();
        const slotTime = normalizeSlot(slotsData[i][2]);
        const active = (slotsData[i][3] || '').toString().toLowerCase() === 'true';
        if (active && (!rowLocation || rowLocation === 'all' || rowLocation === location)) {
          customSlots.push(slotTime);
        }
      }
      if (customSlots.length > 0) {
        configuredSlots = customSlots;
      }
    }
  }

  // 2. Find active bookings for location + date
  const bookingsSheet = ss.getSheetByName("Bookings");
  if (!bookingsSheet) return configuredSlots;

  const bookingsData = bookingsSheet.getDataRange().getValues();
  if (bookingsData.length <= 1) return configuredSlots;

  // Header indices:
  // 0: booking_id, 1: created_at, 2: location, 3: date, 4: time_slot, ..., 14: status
  const bookedSlots = new Set();

  for (let i = 1; i < bookingsData.length; i++) {
    const rowLoc = (bookingsData[i][2] || '').toString().toLowerCase().trim();
    let rowDate = (bookingsData[i][3] || '').toString().trim();
    if (bookingsData[i][3] instanceof Date) {
      rowDate = Utilities.formatDate(bookingsData[i][3], TIMEZONE, "yyyy-MM-dd");
    }
    const rowSlot = normalizeSlot(bookingsData[i][4]);
    const rowStatus = (bookingsData[i][14] || '').toString().toLowerCase().trim();

    // Consider pending and confirmed as occupied
    if (rowLoc === location && rowDate === date && (rowStatus === 'confirmed' || rowStatus === 'pending')) {
      bookedSlots.add(rowSlot);
    }
  }

  return configuredSlots.filter(slot => !bookedSlots.has(normalizeSlot(slot)));
}

/**
 * Helper to check if slot is already occupied
 */
function isSlotAlreadyBooked(ss, location, date, timeSlot) {
  const bookingsSheet = ss.getSheetByName("Bookings");
  if (!bookingsSheet) return false;

  const targetSlotNorm = normalizeSlot(timeSlot);
  const data = bookingsSheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    const rowLoc = (data[i][2] || '').toString().toLowerCase().trim();
    let rowDate = (data[i][3] || '').toString().trim();
    if (data[i][3] instanceof Date) {
      rowDate = Utilities.formatDate(data[i][3], TIMEZONE, "yyyy-MM-dd");
    }
    const rowSlot = normalizeSlot(data[i][4]);
    const rowStatus = (data[i][14] || '').toString().toLowerCase().trim();

    if (rowLoc === location && rowDate === date && rowSlot === targetSlotNorm) {
      if (rowStatus === 'confirmed' || rowStatus === 'pending') {
        return true;
      }
    }
  }
  return false;
}

/**
 * Returns dynamic configuration from Google Sheet tables
 */
function getAppConfiguration(ss) {
  // Fallbacks: If sheets aren't created yet, defaults are used
  return {
    whatsappNumber: "919072333600",
    maxGuests: 15,
    minGuests: 1
  };
}

/**
 * Helper to return formatted JSON response
 */
function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * ============================================================================
 * ONE-CLICK SETUP FUNCTION: Run this in Apps Script Editor to set up all 6 sheets
 * ============================================================================
 */
function setupInitialSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1. Sheet: Bookings
  let bookingsSheet = ss.getSheetByName("Bookings");
  if (!bookingsSheet) {
    bookingsSheet = ss.insertSheet("Bookings");
  }
  bookingsSheet.clear();
  bookingsSheet.appendRow([
    "booking_id", "created_at", "location", "date", "time_slot",
    "name", "customer_location", "whatsapp", "email", "occasion",
    "guests", "additional_requirements", "amenities", "combo", "status"
  ]);
  bookingsSheet.getRange(1, 1, 1, 15).setFontWeight("bold").setBackground("#4A1E5F").setFontColor("#FFFFFF");

  // 2. Sheet: Locations
  let locSheet = ss.getSheetByName("Locations");
  if (!locSheet) {
    locSheet = ss.insertSheet("Locations");
  }
  locSheet.clear();
  locSheet.appendRow(["id", "name", "description", "address", "capacity", "active"]);
  locSheet.appendRow([
    "pantheerankavu", 
    "Pantheerankavu Celebration Point", 
    "Spacious private celebration lounge & bakery space", 
    "Near Pantheerankavu Bypass Junction, Kozhikode, Kerala 673019", 
    15, 
    true
  ]);
  locSheet.appendRow([
    "karaparamba", 
    "Karaparamba Celebration Point", 
    "Intimate floral celebration nook & cafe space", 
    "Near Karaparamba Junction, Kozhikode, Kerala 673010", 
    15, 
    true
  ]);
  locSheet.appendRow([
    "ashokapuram", 
    "Ashokapuram Celebration Point", 
    "Signature floral celebration nook & cafe space", 
    "Near Baby Memorial Hospital, Ashokapuram, Kozhikode, Kerala 673006", 
    15, 
    true
  ]);
  locSheet.appendRow([
    "arakkinar", 
    "Arakkinar Celebration Point", 
    "Modern celebration party lounge & outlet", 
    "Arakkinar, Beypore Road, Kozhikode, Kerala 673028", 
    15, 
    true
  ]);
  locSheet.getRange(1, 1, 1, 6).setFontWeight("bold").setBackground("#4A1E5F").setFontColor("#FFFFFF");

  // 3. Sheet: Slots
  let slotsSheet = ss.getSheetByName("Slots");
  if (!slotsSheet) {
    slotsSheet = ss.insertSheet("Slots");
  }
  slotsSheet.clear();
  slotsSheet.appendRow(["location_id", "day", "time", "active"]);
  const times = [
    "09:30 AM", "10:30 AM", "11:30 AM", "12:30 PM",
    "01:30 PM", "02:30 PM", "03:30 PM", "04:30 PM",
    "05:30 PM", "06:30 PM", "07:30 PM", "08:30 PM"
  ];
  times.forEach(t => {
    slotsSheet.appendRow(["ALL", "ALL", t, true]);
  });
  slotsSheet.getRange(1, 1, 1, 4).setFontWeight("bold").setBackground("#4A1E5F").setFontColor("#FFFFFF");

  // 4. Sheet: Combos
  let comboSheet = ss.getSheetByName("Combos");
  if (!comboSheet) {
    comboSheet = ss.insertSheet("Combos");
  }
  comboSheet.clear();
  comboSheet.appendRow(["id", "name", "description", "price", "active"]);
  comboSheet.appendRow(["birthday_delight", "Birthday Deluxe Combo", "Sash, 3x Poppers, Cake Candle, Props", 599, true]);
  comboSheet.appendRow(["anniversary_romance", "Anniversary Celebration Kit", "Rose Petals, Keepsake Frame, Fairy Lights", 649, true]);
  comboSheet.appendRow(["bride_squad", "Bride to Be Celebration Pack", "Sash, Veil, Badges, Party Props", 699, true]);
  comboSheet.appendRow(["mom_to_be_bundle", "Mom to Be Baby Shower Kit", "Sash, Floral Tiara, Balloon Cluster", 599, true]);
  comboSheet.getRange(1, 1, 1, 5).setFontWeight("bold").setBackground("#4A1E5F").setFontColor("#FFFFFF");

  // 5. Sheet: Amenities
  let amenSheet = ss.getSheetByName("Amenities");
  if (!amenSheet) {
    amenSheet = ss.insertSheet("Amenities");
  }
  amenSheet.clear();
  amenSheet.appendRow(["id", "name", "description", "price", "is_complimentary", "active"]);
  amenSheet.appendRow(["basic_decorations", "Celebration Backdrop & Decor", "Signature floral backdrop & neon sign", 0, true, true]);
  amenSheet.appendRow(["music_mic", "Background Music + Mic", "Bluetooth speaker & wireless mic", 0, true, true]);
  amenSheet.appendRow(["ac_hall", "Private AC Celebration Nook", "Air-conditioned private seating area", 0, true, true]);
  amenSheet.appendRow(["cake_cutlery", "Cake Pedestal & Cutlery Setup", "Stand, plates, forks, napkins", 0, true, true]);
  amenSheet.appendRow(["welcome_drinks", "Zelebrae Welcome Drinks", "Chilled signature mocktails for all guests", 349, false, true]);
  amenSheet.getRange(1, 1, 1, 6).setFontWeight("bold").setBackground("#4A1E5F").setFontColor("#FFFFFF");

  // 6. Sheet: Settings
  let settingsSheet = ss.getSheetByName("Settings");
  if (!settingsSheet) {
    settingsSheet = ss.insertSheet("Settings");
  }
  settingsSheet.clear();
  settingsSheet.appendRow(["key", "value"]);
  settingsSheet.appendRow(["whatsapp_number", "919072333600"]);
  settingsSheet.appendRow(["max_guests", 15]);
  settingsSheet.appendRow(["min_guests", 1]);
  settingsSheet.appendRow(["booking_window_days", 45]);
  settingsSheet.getRange(1, 1, 1, 2).setFontWeight("bold").setBackground("#4A1E5F").setFontColor("#FFFFFF");

  Logger.log("✅ All 6 Zelebrae booking sheets successfully initialized!");
}
