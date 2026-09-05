/**
 * ============================================================================
 * ZELEBRAE PASTRIES — CELEBRATION POINT BOOKING API
 * Google Apps Script Web App Endpoint
 * ============================================================================
 * 
 * Features:
 * 1. Dedicated Separate Spreadsheets (Branch Isolation):
 *    Each celebration location has its OWN separate Google Spreadsheet file:
 *    - Pantheerankavu
 *    - Karaparamba
 *    - Ashokapuram
 *    - Arakkinar
 *    Each branch team is given access ONLY to their own spreadsheet link,
 *    guaranteeing that branches cannot view each other's booking data!
 * 
 * 2. doGet(e): Reads configuration & checks real-time slot availability for
 *    the selected location and date from its dedicated spreadsheet.
 * 
 * 3. doPost(e): Atomic booking creation protected by LockService to eliminate
 *    race conditions and double-bookings. Appends booking row exclusively to
 *    the corresponding branch's spreadsheet.
 * 
 * 4. setupSeparateBranchSpreadsheets(): One-click function that automatically
 *    creates 4 brand-new separate Google Spreadsheets in your Google Drive,
 *    styles their headers, and saves their links.
 */

// Timezone configured for Kerala, India
const TIMEZONE = "Asia/Kolkata";

// Standard 4 celebration locations and their display names
const LOCATION_SHEET_MAP = {
  'pantheerankavu': 'Pantheerankavu',
  'karaparamba': 'Karaparamba',
  'ashokapuram': 'Ashokapuram',
  'arakkinar': 'Arakkinar'
};

const LOCATION_SHEET_NAMES = ['Pantheerankavu', 'Karaparamba', 'Ashokapuram', 'Arakkinar'];

/**
 * ---------------------------------------------------------------------------
 * DEDICATED SPREADSHEET LINKS FOR EACH BRANCH
 * ---------------------------------------------------------------------------
 * You can either:
 * A) Run setupSeparateBranchSpreadsheets() once from the Apps Script toolbar.
 *    It will automatically create 4 separate Google Spreadsheets in your Google
 *    Drive and store their IDs automatically!
 * 
 * OR
 * 
 * B) Paste your custom Google Spreadsheet URLs or IDs below:
 */
const LOCATION_SPREADSHEETS = {
  'pantheerankavu': '', // e.g. "https://docs.google.com/spreadsheets/d/1abc.../edit" OR "1abc..."
  'karaparamba': '',
  'ashokapuram': '',
  'arakkinar': ''
};

// Standard booking column headers
const BOOKING_HEADERS = [
  "booking_id",
  "created_at",
  "location",
  "date",
  "time_slot",
  "name",
  "customer_location",
  "whatsapp",
  "email",
  "occasion",
  "guests",
  "additional_requirements",
  "amenities",
  "combo",
  "status"
];

/**
 * Extracts raw Google Spreadsheet ID from either a full URL or a raw ID string
 */
function extractSpreadsheetId(val) {
  if (!val) return '';
  var str = val.toString().trim();
  var match = str.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }
  return str;
}

/**
 * Maps any location identifier/string to the exact sheet name
 */
function getLocationSheetName(location) {
  const loc = (location || '').toString().toLowerCase().trim();
  for (const key in LOCATION_SHEET_MAP) {
    if (loc.indexOf(key) !== -1) {
      return LOCATION_SHEET_MAP[key];
    }
  }
  return 'Pantheerankavu';
}

/**
 * Returns the dedicated Spreadsheet object for the given location:
 * 1. Checks LOCATION_SPREADSHEETS hardcoded mapping
 * 2. Checks ScriptProperties (set automatically by setupSeparateBranchSpreadsheets)
 * 3. Falls back to SpreadsheetApp.getActiveSpreadsheet()
 */
function getLocationSpreadsheet(location) {
  const loc = (location || '').toString().toLowerCase().trim();
  let matchedKey = 'pantheerankavu';
  for (const key in LOCATION_SHEET_MAP) {
    if (loc.indexOf(key) !== -1) {
      matchedKey = key;
      break;
    }
  }

  // 1. Check hardcoded object
  let sheetId = extractSpreadsheetId(LOCATION_SPREADSHEETS[matchedKey]);

  // 2. Check ScriptProperties if not hardcoded
  if (!sheetId) {
    try {
      const props = PropertiesService.getScriptProperties();
      const propKey = 'SPREADSHEET_' + matchedKey.toUpperCase();
      sheetId = extractSpreadsheetId(props.getProperty(propKey));
    } catch (e) {
      Logger.log("ScriptProperties error: " + e.toString());
    }
  }

  // 3. Open dedicated spreadsheet by ID if available
  if (sheetId) {
    try {
      return SpreadsheetApp.openById(sheetId);
    } catch (err) {
      Logger.log("⚠️ Could not open spreadsheet with ID " + sheetId + ": " + err.toString());
    }
  }

  // Fallback to active spreadsheet (if script is bound to a sheet)
  try {
    return SpreadsheetApp.getActiveSpreadsheet();
  } catch (e) {
    return null;
  }
}

/**
 * Finds or initializes the booking sheet within the given spreadsheet
 */
function getBookingTargetSheet(ss, location) {
  if (!ss) return null;
  const locSheetName = getLocationSheetName(location);

  // Try sheet named after the location first
  let sheet = ss.getSheetByName(locSheetName);
  if (!sheet) {
    // Try sheet named "Bookings"
    sheet = ss.getSheetByName("Bookings");
  }
  if (!sheet) {
    // Use the first sheet
    sheet = ss.getSheets()[0];
  }

  // Ensure headers are present
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(BOOKING_HEADERS);
    sheet.getRange(1, 1, 1, BOOKING_HEADERS.length)
      .setFontWeight("bold")
      .setBackground("#4A1E5F")
      .setFontColor("#FFFFFF");
  }
  return sheet;
}

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
      const location = (e.parameter.location || 'pantheerankavu').toLowerCase().trim();
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
        targetSheet: getLocationSheetName(location),
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
 * Routes the booking directly to the corresponding branch's separate spreadsheet.
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
    const rawLocation = (body.location || 'pantheerankavu').toLowerCase().trim();
    const date = (body.date || '').trim(); // YYYY-MM-DD
    const rawTimeSlot = (body.time_slot || body.timeSlot || '').toString().trim().replace(/^'/, '');
    const name = (body.name || '').trim();
    const customerLocation = (body.customer_location || body.customerLocation || '').trim();
    const rawWhatsapp = (body.whatsapp || '').toString().trim().replace(/^'/, '');
    const email = (body.email || '').trim();
    const occasion = (body.occasion || '').trim();
    const guests = parseInt(body.guests, 10) || 1;
    const amenities = (body.amenities || '').trim();
    const combo = (body.combo || 'None').trim();
    const additionalRequirements = (body.additional_requirements || body.additionalRequirements || '').trim();
    const guidelinesAgreed = body.guidelines_agreed === true || body.guidelines_agreed === 'true';

    // 3. Validation
    if (!rawLocation || !date || !rawTimeSlot || !name || !rawWhatsapp || !occasion) {
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

    // 4. Double booking collision check in the branch's spreadsheet
    const isBooked = isSlotAlreadyBooked(ss, rawLocation, date, rawTimeSlot);
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

    // 6. Open the branch's dedicated spreadsheet
    const branchSpreadsheet = getLocationSpreadsheet(rawLocation);
    const targetSheet = getBookingTargetSheet(branchSpreadsheet, rawLocation);
    const targetLocationName = getLocationSheetName(rawLocation);

    if (!targetSheet) {
      throw new Error("Could not access booking sheet for " + targetLocationName);
    }

    // Prefix single quote ' so Google Sheets strictly preserves text literal and never interprets '+' as formula error
    const cellWhatsapp = "'" + rawWhatsapp;
    const cellTimeSlot = "'" + rawTimeSlot;

    // Append booking row ONLY to the corresponding branch's spreadsheet
    targetSheet.appendRow([
      bookingId,
      createdAt,
      targetLocationName,
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
      "confirmed"
    ]);

    // Ensure write is immediately committed to Google Sheets
    SpreadsheetApp.flush();

    return jsonResponse({
      success: true,
      bookingId: bookingId,
      location: targetLocationName,
      spreadsheetName: branchSpreadsheet ? branchSpreadsheet.getName() : targetLocationName,
      spreadsheetUrl: branchSpreadsheet ? branchSpreadsheet.getUrl() : '',
      message: "Celebration slot booked successfully in " + targetLocationName + "!"
    });

  } catch (err) {
    return jsonResponse({
      success: false,
      error: "BOOKING_FAILED",
      message: "An error occurred: " + err.toString()
    });
  } finally {
    // Always release lock
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
 * Reads bookings directly from the branch's dedicated spreadsheet
 */
function computeAvailableSlots(ss, location, date) {
  // 1. Base slots (from Slots config sheet or defaults)
  let configuredSlots = [
    "09:30 AM", "10:30 AM", "11:30 AM", "12:30 PM",
    "01:30 PM", "02:30 PM", "03:30 PM", "04:30 PM",
    "05:30 PM", "06:30 PM", "07:30 PM", "08:30 PM"
  ];

  if (ss) {
    const slotsSheet = ss.getSheetByName("Slots");
    if (slotsSheet) {
      const slotsData = slotsSheet.getDataRange().getDisplayValues();
      if (slotsData.length > 1) {
        const customSlots = [];
        for (let i = 1; i < slotsData.length; i++) {
          const rowLocation = (slotsData[i][0] || '').toString().toLowerCase().trim();
          const slotTime = normalizeSlot(slotsData[i][2]);
          const active = (slotsData[i][3] || '').toString().toLowerCase() === 'true';
          if (active && (!rowLocation || rowLocation === 'all' || rowLocation === location.toLowerCase())) {
            customSlots.push(slotTime);
          }
        }
        if (customSlots.length > 0) {
          configuredSlots = customSlots;
        }
      }
    }
  }

  // 2. Find booked slots from the branch's dedicated spreadsheet
  const bookedSlots = new Set();
  const targetLocationName = getLocationSheetName(location);
  const branchSS = getLocationSpreadsheet(location) || ss;

  if (branchSS) {
    const targetSheet = getBookingTargetSheet(branchSS, location);
    if (targetSheet) {
      const sheetData = targetSheet.getDataRange().getValues();
      for (let i = 1; i < sheetData.length; i++) {
        let rowDate = (sheetData[i][3] || '').toString().trim();
        if (sheetData[i][3] instanceof Date) {
          rowDate = Utilities.formatDate(sheetData[i][3], TIMEZONE, "yyyy-MM-dd");
        }
        const rowSlot = normalizeSlot(sheetData[i][4]);
        const rowStatus = (sheetData[i][14] || '').toString().toLowerCase().trim();

        if (rowDate === date && (rowStatus === 'confirmed' || rowStatus === 'pending')) {
          bookedSlots.add(rowSlot);
        }
      }
    }
  }

  // Fallback: Check active master spreadsheet if different from branch spreadsheet
  if (ss && branchSS && ss.getId() !== branchSS.getId()) {
    const legacySheet = ss.getSheetByName("Bookings") || ss.getSheetByName(targetLocationName);
    if (legacySheet) {
      const legacyData = legacySheet.getDataRange().getValues();
      for (let i = 1; i < legacyData.length; i++) {
        const rowLoc = (legacyData[i][2] || '').toString().toLowerCase().trim();
        let rowDate = (legacyData[i][3] || '').toString().trim();
        if (legacyData[i][3] instanceof Date) {
          rowDate = Utilities.formatDate(legacyData[i][3], TIMEZONE, "yyyy-MM-dd");
        }
        const rowSlot = normalizeSlot(legacyData[i][4]);
        const rowStatus = (legacyData[i][14] || '').toString().toLowerCase().trim();

        const isMatching = rowLoc.indexOf(location.toLowerCase()) !== -1 || rowLoc === targetLocationName.toLowerCase();
        if (isMatching && rowDate === date && (rowStatus === 'confirmed' || rowStatus === 'pending')) {
          bookedSlots.add(rowSlot);
        }
      }
    }
  }

  return configuredSlots.filter(slot => !bookedSlots.has(normalizeSlot(slot)));
}

/**
 * Helper to check if a slot is already occupied
 * Checks the dedicated branch spreadsheet
 */
function isSlotAlreadyBooked(ss, location, date, timeSlot) {
  const targetSlotNorm = normalizeSlot(timeSlot);
  const targetLocationName = getLocationSheetName(location);
  const branchSS = getLocationSpreadsheet(location) || ss;

  if (branchSS) {
    const targetSheet = getBookingTargetSheet(branchSS, location);
    if (targetSheet) {
      const data = targetSheet.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        let rowDate = (data[i][3] || '').toString().trim();
        if (data[i][3] instanceof Date) {
          rowDate = Utilities.formatDate(data[i][3], TIMEZONE, "yyyy-MM-dd");
        }
        const rowSlot = normalizeSlot(data[i][4]);
        const rowStatus = (data[i][14] || '').toString().toLowerCase().trim();

        if (rowDate === date && rowSlot === targetSlotNorm) {
          if (rowStatus === 'confirmed' || rowStatus === 'pending') {
            return true;
          }
        }
      }
    }
  }

  // Fallback: Check master spreadsheet if different
  if (ss && branchSS && ss.getId() !== branchSS.getId()) {
    const legacySheet = ss.getSheetByName("Bookings") || ss.getSheetByName(targetLocationName);
    if (legacySheet) {
      const data = legacySheet.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        const rowLoc = (data[i][2] || '').toString().toLowerCase().trim();
        let rowDate = (data[i][3] || '').toString().trim();
        if (data[i][3] instanceof Date) {
          rowDate = Utilities.formatDate(data[i][3], TIMEZONE, "yyyy-MM-dd");
        }
        const rowSlot = normalizeSlot(data[i][4]);
        const rowStatus = (data[i][14] || '').toString().toLowerCase().trim();

        const isMatching = rowLoc.indexOf(location.toLowerCase()) !== -1 || rowLoc === targetLocationName.toLowerCase();
        if (isMatching && rowDate === date && rowSlot === targetSlotNorm) {
          if (rowStatus === 'confirmed' || rowStatus === 'pending') {
            return true;
          }
        }
      }
    }
  }

  return false;
}

/**
 * Returns dynamic configuration from Google Sheet tables
 */
function getAppConfiguration(ss) {
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
 * ONE-CLICK BRANCH ISOLATION SETUP:
 * Creates 4 completely separate Google Spreadsheets (one per branch),
 * styles their headers, saves their IDs, and logs the 4 links.
 * ============================================================================
 */
function setupSeparateBranchSpreadsheets() {
  const branches = [
    { key: 'pantheerankavu', name: 'Zelebrae Bookings - Pantheerankavu' },
    { key: 'karaparamba', name: 'Zelebrae Bookings - Karaparamba' },
    { key: 'ashokapuram', name: 'Zelebrae Bookings - Ashokapuram' },
    { key: 'arakkinar', name: 'Zelebrae Bookings - Arakkinar' }
  ];

  const props = PropertiesService.getScriptProperties();
  const createdSheets = [];

  branches.forEach(b => {
    let sheetId = extractSpreadsheetId(LOCATION_SPREADSHEETS[b.key]);
    if (!sheetId) {
      sheetId = extractSpreadsheetId(props.getProperty('SPREADSHEET_' + b.key.toUpperCase()));
    }

    let ss = null;
    if (sheetId) {
      try {
        ss = SpreadsheetApp.openById(sheetId);
      } catch (e) {
        ss = null;
      }
    }

    // Create new dedicated spreadsheet if not exists
    if (!ss) {
      ss = SpreadsheetApp.create(b.name);
      props.setProperty('SPREADSHEET_' + b.key.toUpperCase(), ss.getId());
      Logger.log("Created new spreadsheet: " + b.name + " (" + ss.getId() + ")");
    }

    // Setup headers on its primary sheet
    const sheet = ss.getSheets()[0];
    sheet.setName("Bookings");
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(BOOKING_HEADERS);
    }
    sheet.getRange(1, 1, 1, BOOKING_HEADERS.length)
      .setFontWeight("bold")
      .setBackground("#4A1E5F")
      .setFontColor("#FFFFFF");

    createdSheets.push({
      key: b.key,
      name: b.name,
      id: ss.getId(),
      url: ss.getUrl()
    });
  });

  // If running from a master spreadsheet, write a summary "Branch Links" tab
  try {
    const masterSS = SpreadsheetApp.getActiveSpreadsheet();
    if (masterSS) {
      let linkSheet = masterSS.getSheetByName("Branch Links");
      if (!linkSheet) {
        linkSheet = masterSS.insertSheet("Branch Links", 0);
      }
      linkSheet.clear();
      linkSheet.appendRow(["Branch Name", "Location Code", "Dedicated Spreadsheet Link", "Spreadsheet ID"]);
      linkSheet.getRange(1, 1, 1, 4).setFontWeight("bold").setBackground("#4A1E5F").setFontColor("#FFFFFF");

      createdSheets.forEach(s => {
        linkSheet.appendRow([
          s.name,
          s.key,
          s.url,
          s.id
        ]);
      });
      linkSheet.autoResizeColumns(1, 4);
    }
  } catch (e) {
    Logger.log("Note: Running as standalone script or couldn't write to master sheet: " + e.toString());
  }

  Logger.log("\n==================================================================");
  Logger.log("🎉 4 DEDICATED BRANCH SPREADSHEETS ARE READY!");
  Logger.log("Share each link ONLY with its corresponding branch team:\n");
  createdSheets.forEach(s => {
    Logger.log("📍 " + s.name + ":");
    Logger.log("   " + s.url + "\n");
  });
  Logger.log("==================================================================");
}

/**
 * ============================================================================
 * ONE-CLICK COMPLETE SETUP FUNCTION:
 * Run this in Apps Script Editor to set up:
 * 1. The 4 dedicated branch spreadsheets
 * 2. The configuration sheets (Locations, Slots, Combos, Amenities, Settings)
 * ============================================================================
 */
function setupInitialSheets() {
  // 1. Create/configure the 4 dedicated branch spreadsheets
  setupSeparateBranchSpreadsheets();

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) return;

  // 2. Sheet: Locations (Config)
  let locSheet = ss.getSheetByName("Locations");
  if (!locSheet) {
    locSheet = ss.insertSheet("Locations");
  }
  locSheet.clear();
  locSheet.appendRow(["id", "name", "description", "address", "capacity", "active"]);
  locSheet.appendRow([
    "pantheerankavu", 
    "Pantheerankavu", 
    "Spacious private celebration lounge & bakery space", 
    "Near Pantheerankavu Bypass Junction, Kozhikode, Kerala 673019", 
    15, 
    true
  ]);
  locSheet.appendRow([
    "karaparamba", 
    "Karaparamba", 
    "Intimate floral celebration nook & cafe space", 
    "Near Karaparamba Junction, Kozhikode, Kerala 673010", 
    15, 
    true
  ]);
  locSheet.appendRow([
    "ashokapuram", 
    "Ashokapuram", 
    "Signature floral celebration nook & cafe space", 
    "Near Baby Memorial Hospital, Ashokapuram, Kozhikode, Kerala 673006", 
    15, 
    true
  ]);
  locSheet.appendRow([
    "arakkinar", 
    "Arakkinar", 
    "Modern celebration party lounge & outlet", 
    "Arakkinar, Beypore Road, Kozhikode, Kerala 673028", 
    15, 
    true
  ]);
  locSheet.getRange(1, 1, 1, 6).setFontWeight("bold").setBackground("#4A1E5F").setFontColor("#FFFFFF");

  // 3. Sheet: Slots (Config)
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

  // 4. Sheet: Combos (Config)
  let comboSheet = ss.getSheetByName("Combos");
  if (!comboSheet) {
    comboSheet = ss.insertSheet("Combos");
  }
  comboSheet.clear();
  comboSheet.appendRow(["id", "name", "description", "price", "active"]);
  comboSheet.appendRow(["birthday_combo", "Birthday Combo", "Custom Birthday Sash, Crown, Poppers & Props (DC1-DC8)", 350, true]);
  comboSheet.appendRow(["anniversary_combo", "Anniversary Combo", "Rose Petals, Keepsake Frame, LED Fairy Lights (AC1-AC4)", 420, true]);
  comboSheet.appendRow(["bride_to_be_combo", "Bride to Be Combo", "Sash, Veil, Badges, Party Props (BC1-BC9)", 480, true]);
  comboSheet.appendRow(["mom_to_be_combo", "Mom to Be Combo", "Sash, Floral Tiara, Balloon Cluster (MC1-MC6)", 730, true]);
  comboSheet.appendRow(["groom_to_be_combo", "Groom to be Combo", "Sash, Badges, Party Poppers (GC1-GC8)", 455, true]);
  comboSheet.getRange(1, 1, 1, 5).setFontWeight("bold").setBackground("#4A1E5F").setFontColor("#FFFFFF");

  // 5. Sheet: Amenities (Config)
  let amenSheet = ss.getSheetByName("Amenities");
  if (!amenSheet) {
    amenSheet = ss.insertSheet("Amenities");
  }
  amenSheet.clear();
  amenSheet.appendRow(["id", "name", "description", "price", "is_complimentary", "active"]);
  amenSheet.appendRow(["basic_decorations", "Basic Decorations", "Signature floral backdrop & celebration setup", 0, true, true]);
  amenSheet.appendRow(["music_mic", "Background Music & Mic", "Bluetooth speaker & wireless mic", 0, true, true]);
  amenSheet.appendRow(["ac_hall", "AC Hall", "Air-conditioned private seating area", 0, true, true]);
  amenSheet.appendRow(["welcome_drink", "Welcome Drink", "Complimentary signature welcome drink", 0, true, true]);
  amenSheet.getRange(1, 1, 1, 6).setFontWeight("bold").setBackground("#4A1E5F").setFontColor("#FFFFFF");

  // 6. Sheet: Settings (Config)
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

  Logger.log("✅ All branch spreadsheets & config sheets successfully initialized!");
}
