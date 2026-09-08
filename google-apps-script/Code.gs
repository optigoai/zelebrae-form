/**
 * ============================================================================
 * ZELEBRAE PASTRIES — CELEBRATION POINT BOOKING API
 * Google Apps Script Web App Endpoint
 * ============================================================================
 * 
 * Features:
 * 1. Dedicated Branch Spreadsheets (Branch Isolation):
 *    Each celebration location has its OWN separate Google Spreadsheet file:
 *    - Pantheerankavu
 *    - Karaparamba
 *    - Ashokapuram
 *    - Arakkinar
 *    Each branch team is given access ONLY to their own spreadsheet link,
 *    guaranteeing that branches cannot view each other's booking data!
 * 
 * 2. Real-Time Centralized Master Sheet ("All Bookings"):
 *    At the SAME TIME, every booking across ALL branches is automatically
 *    mirrored to the Main Master Spreadsheet under the "All Bookings" sheet.
 *    The central admin/management can view all branches in one unified dashboard!
 * 
 * 3. doGet(e): Reads configuration & checks real-time slot availability for
 *    the selected location and date.
 * 
 * 4. doPost(e): Atomic booking creation protected by LockService to eliminate
 *    race conditions and double-bookings. Appends booking row simultaneously to
 *    both the branch's dedicated spreadsheet and the central master spreadsheet.
 * 
 * 5. setupSeparateBranchSpreadsheets(): One-click function that automatically
 *    creates 4 brand-new separate Google Spreadsheets in your Google Drive,
 *    styles their headers, and saves their links.
 * 
 * 6. setupInitialSheets(): Initializes the master sheet ("All Bookings", "Branch Links",
 *    and configuration sheets) and all 4 branch spreadsheets.
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

/**
 * Master Spreadsheet Configuration (Admin / Central Dashboard)
 * Holds ALL bookings across all branches in one central place.
 * Leave blank if this script is attached directly to your Master Spreadsheet.
 */
const MASTER_SPREADSHEET_ID_OR_URL = '';

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
 * Returns the Master Spreadsheet object (where all branch data is centralized)
 */
function getMasterSpreadsheet() {
  let masterId = extractSpreadsheetId(MASTER_SPREADSHEET_ID_OR_URL);
  if (!masterId) {
    try {
      const props = PropertiesService.getScriptProperties();
      masterId = extractSpreadsheetId(props.getProperty('MASTER_SPREADSHEET_ID'));
    } catch (e) {}
  }

  if (masterId) {
    try {
      return SpreadsheetApp.openById(masterId);
    } catch (err) {
      Logger.log("⚠️ Could not open master spreadsheet by ID: " + err.toString());
    }
  }

  try {
    return SpreadsheetApp.getActiveSpreadsheet();
  } catch (e) {
    return null;
  }
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
      Logger.log("⚠️ Could not open branch spreadsheet with ID " + sheetId + ": " + err.toString());
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
      .setBackground("#592F7C")
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
    const ss = getMasterSpreadsheet() || SpreadsheetApp.getActiveSpreadsheet();

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

    if (action === 'getBookingsByPhone') {
      const rawPhone = (e.parameter.phone || '').toString().trim();
      const cleanPhone = rawPhone.replace(/\D/g, '');
      if (!cleanPhone || cleanPhone.length < 5) {
        return jsonResponse({
          success: false,
          error: "Valid phone parameter is required"
        });
      }

      const bookings = getBookingsForPhone(ss, cleanPhone);
      return jsonResponse({
        success: true,
        phone: cleanPhone,
        bookings: bookings
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
 * Routes the booking:
 * 1. Exclusively to the branch's separate spreadsheet.
 * 2. AT THE SAME TIME, to the Central Master Spreadsheet ("All Bookings").
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

    const masterSS = getMasterSpreadsheet() || SpreadsheetApp.getActiveSpreadsheet();

    // Check if this is a cancellation request
    if (body.action === 'cancelBooking') {
      return handleCancelBooking(body, masterSS);
    }

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

    // 4. Double booking collision check in the branch's spreadsheet & master sheet
    const isBooked = isSlotAlreadyBooked(masterSS, rawLocation, date, rawTimeSlot);
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

    // 6. Prepare booking data row
    const targetLocationName = getLocationSheetName(rawLocation);
    const cellWhatsapp = "'" + rawWhatsapp;
    const cellTimeSlot = "'" + rawTimeSlot;

    const bookingRow = [
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
    ];

    // 7. Write to the branch's dedicated spreadsheet
    const branchSpreadsheet = getLocationSpreadsheet(rawLocation);
    let branchTargetSheet = null;
    if (branchSpreadsheet) {
      branchTargetSheet = getBookingTargetSheet(branchSpreadsheet, rawLocation);
      if (branchTargetSheet) {
        branchTargetSheet.appendRow(bookingRow);
      }
    }

    // 8. AT THE SAME TIME: Write to the Main Master Spreadsheet ("All Bookings")
    if (masterSS) {
      let masterAllSheet = masterSS.getSheetByName("All Bookings") || masterSS.getSheetByName("Bookings");
      if (!masterAllSheet) {
        masterAllSheet = masterSS.insertSheet("All Bookings", 0);
        masterAllSheet.appendRow(BOOKING_HEADERS);
        masterAllSheet.getRange(1, 1, 1, BOOKING_HEADERS.length)
          .setFontWeight("bold")
          .setBackground("#592F7C")
          .setFontColor("#FFFFFF");
      }

      // Avoid duplicate appending if masterSS and branchSpreadsheet are the exact same sheet tab
      const isSameSheet = branchSpreadsheet && 
                          masterSS.getId() === branchSpreadsheet.getId() && 
                          branchTargetSheet && 
                          masterAllSheet.getName() === branchTargetSheet.getName();

      if (!isSameSheet) {
        masterAllSheet.appendRow(bookingRow);
      }

      // Also if a dedicated tab for this location exists in the master sheet, append there too
      let masterLocTab = masterSS.getSheetByName(targetLocationName);
      if (masterLocTab && masterLocTab.getName() !== masterAllSheet.getName()) {
        if (masterLocTab.getLastRow() === 0) {
          masterLocTab.appendRow(BOOKING_HEADERS);
          masterLocTab.getRange(1, 1, 1, BOOKING_HEADERS.length)
            .setFontWeight("bold")
            .setBackground("#592F7C")
            .setFontColor("#FFFFFF");
        }
        masterLocTab.appendRow(bookingRow);
      }
    }

    // Ensure write is immediately committed to Google Sheets
    SpreadsheetApp.flush();

    return jsonResponse({
      success: true,
      bookingId: bookingId,
      location: targetLocationName,
      branchSpreadsheet: branchSpreadsheet ? branchSpreadsheet.getName() : targetLocationName,
      branchUrl: branchSpreadsheet ? branchSpreadsheet.getUrl() : '',
      masterRecorded: !!masterSS,
      message: "Celebration slot booked successfully in " + targetLocationName + " and Master Sheet!"
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
 * Reads bookings directly from the branch's dedicated spreadsheet & master spreadsheet
 */
function computeAvailableSlots(ss, location, date) {
  // 1. Base slots (from Slots config sheet or defaults)
  let configuredSlots = [
    "09:30 AM", "10:30 AM", "11:30 AM", "12:30 PM",
    "01:30 PM", "02:30 PM", "03:30 PM", "04:30 PM",
    "05:30 PM", "06:30 PM", "07:30 PM", "08:30 PM"
  ];

  const masterSS = ss || getMasterSpreadsheet();
  if (masterSS) {
    const slotsSheet = masterSS.getSheetByName("Slots");
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
  const branchSS = getLocationSpreadsheet(location) || masterSS;

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

  // Fallback: Also check master spreadsheet's All Bookings / Bookings / location tab
  if (masterSS && (!branchSS || masterSS.getId() !== branchSS.getId())) {
    const masterCheckSheet = masterSS.getSheetByName("All Bookings") || 
                             masterSS.getSheetByName("Bookings") || 
                             masterSS.getSheetByName(targetLocationName);
    if (masterCheckSheet) {
      const masterData = masterCheckSheet.getDataRange().getValues();
      for (let i = 1; i < masterData.length; i++) {
        const rowLoc = (masterData[i][2] || '').toString().toLowerCase().trim();
        let rowDate = (masterData[i][3] || '').toString().trim();
        if (masterData[i][3] instanceof Date) {
          rowDate = Utilities.formatDate(masterData[i][3], TIMEZONE, "yyyy-MM-dd");
        }
        const rowSlot = normalizeSlot(masterData[i][4]);
        const rowStatus = (masterData[i][14] || '').toString().toLowerCase().trim();

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
 * Checks the dedicated branch spreadsheet and master spreadsheet
 */
function isSlotAlreadyBooked(ss, location, date, timeSlot) {
  const targetSlotNorm = normalizeSlot(timeSlot);
  const targetLocationName = getLocationSheetName(location);
  const masterSS = ss || getMasterSpreadsheet();
  const branchSS = getLocationSpreadsheet(location) || masterSS;

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

  // Also check master spreadsheet
  if (masterSS && (!branchSS || masterSS.getId() !== branchSS.getId())) {
    const masterCheckSheet = masterSS.getSheetByName("All Bookings") || 
                             masterSS.getSheetByName("Bookings") || 
                             masterSS.getSheetByName(targetLocationName);
    if (masterCheckSheet) {
      const data = masterCheckSheet.getDataRange().getValues();
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
    whatsappNumber: "918585855859",
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
      Logger.log("Created new branch spreadsheet: " + b.name + " (" + ss.getId() + ")");
    }

    // Setup headers on its primary sheet
    const sheet = ss.getSheets()[0];
    sheet.setName("Bookings");
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(BOOKING_HEADERS);
    }
    sheet.getRange(1, 1, 1, BOOKING_HEADERS.length)
      .setFontWeight("bold")
      .setBackground("#592F7C")
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
    const masterSS = getMasterSpreadsheet() || SpreadsheetApp.getActiveSpreadsheet();
    if (masterSS) {
      let linkSheet = masterSS.getSheetByName("Branch Links");
      if (!linkSheet) {
        linkSheet = masterSS.insertSheet("Branch Links", 1);
      }
      linkSheet.clear();
      linkSheet.appendRow(["Branch Name", "Location Code", "Dedicated Spreadsheet Link", "Spreadsheet ID"]);
      linkSheet.getRange(1, 1, 1, 4).setFontWeight("bold").setBackground("#592F7C").setFontColor("#FFFFFF");

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
    Logger.log("Note: Could not write Branch Links tab to master sheet: " + e.toString());
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
 * 1. The central Master Spreadsheet ("All Bookings", "Branch Links", Config)
 * 2. The 4 dedicated branch spreadsheets
 * ============================================================================
 */
function setupInitialSheets() {
  const masterSS = getMasterSpreadsheet() || SpreadsheetApp.getActiveSpreadsheet();
  if (masterSS) {
    try {
      const props = PropertiesService.getScriptProperties();
      props.setProperty('MASTER_SPREADSHEET_ID', masterSS.getId());
    } catch (e) {}

    // 1. Central Sheet: All Bookings (Unified feed for all branches)
    let allBookingsSheet = masterSS.getSheetByName("All Bookings");
    if (!allBookingsSheet) {
      allBookingsSheet = masterSS.insertSheet("All Bookings", 0);
    }
    if (allBookingsSheet.getLastRow() === 0) {
      allBookingsSheet.appendRow(BOOKING_HEADERS);
    }
    allBookingsSheet.getRange(1, 1, 1, BOOKING_HEADERS.length)
      .setFontWeight("bold")
      .setBackground("#592F7C")
      .setFontColor("#FFFFFF");
  }

  // 2. Create/configure the 4 dedicated branch spreadsheets & write Branch Links tab
  setupSeparateBranchSpreadsheets();

  if (!masterSS) return;

  // 3. Sheet: Locations (Config)
  let locSheet = masterSS.getSheetByName("Locations");
  if (!locSheet) {
    locSheet = masterSS.insertSheet("Locations");
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
  locSheet.getRange(1, 1, 1, 6).setFontWeight("bold").setBackground("#592F7C").setFontColor("#FFFFFF");

  // 4. Sheet: Slots (Config)
  let slotsSheet = masterSS.getSheetByName("Slots");
  if (!slotsSheet) {
    slotsSheet = masterSS.insertSheet("Slots");
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
  slotsSheet.getRange(1, 1, 1, 4).setFontWeight("bold").setBackground("#592F7C").setFontColor("#FFFFFF");

  // 5. Sheet: Combos (Config)
  let comboSheet = masterSS.getSheetByName("Combos");
  if (!comboSheet) {
    comboSheet = masterSS.insertSheet("Combos");
  }
  comboSheet.clear();
  comboSheet.appendRow(["id", "name", "description", "price", "active"]);
  comboSheet.appendRow(["birthday_combo", "Birthday Combo", "Custom Birthday Sash, Crown, Poppers & Props (DC1-DC8)", 350, true]);
  comboSheet.appendRow(["anniversary_combo", "Anniversary Combo", "Rose Petals, Keepsake Frame, LED Fairy Lights (AC1-AC4)", 420, true]);
  comboSheet.appendRow(["bride_to_be_combo", "Bride to Be Combo", "Sash, Veil, Badges, Party Props (BC1-BC9)", 480, true]);
  comboSheet.appendRow(["mom_to_be_combo", "Mom to Be Combo", "Sash, Floral Tiara, Balloon Cluster (MC1-MC6)", 730, true]);
  comboSheet.appendRow(["groom_to_be_combo", "Groom to be Combo", "Sash, Badges, Party Poppers (GC1-GC8)", 455, true]);
  comboSheet.getRange(1, 1, 1, 5).setFontWeight("bold").setBackground("#592F7C").setFontColor("#FFFFFF");

  // 6. Sheet: Amenities (Config)
  let amenSheet = masterSS.getSheetByName("Amenities");
  if (!amenSheet) {
    amenSheet = masterSS.insertSheet("Amenities");
  }
  amenSheet.clear();
  amenSheet.appendRow(["id", "name", "description", "price", "is_complimentary", "active"]);
  amenSheet.appendRow(["basic_decorations", "Basic Decorations", "Signature floral backdrop & celebration setup", 0, true, true]);
  amenSheet.appendRow(["music_mic", "Background Music & Mic", "Bluetooth speaker & wireless mic", 0, true, true]);
  amenSheet.appendRow(["ac_hall", "AC Hall", "Air-conditioned private seating area", 0, true, true]);
  amenSheet.appendRow(["welcome_drink", "Welcome Drink", "Complimentary signature welcome drink", 0, true, true]);
  amenSheet.getRange(1, 1, 1, 6).setFontWeight("bold").setBackground("#592F7C").setFontColor("#FFFFFF");

  // 7. Sheet: Settings (Config)
  let settingsSheet = masterSS.getSheetByName("Settings");
  if (!settingsSheet) {
    settingsSheet = masterSS.insertSheet("Settings");
  }
  settingsSheet.clear();
  settingsSheet.appendRow(["key", "value"]);
  settingsSheet.appendRow(["whatsapp_number", "918585855859"]);
  settingsSheet.appendRow(["max_guests", 15]);
  settingsSheet.appendRow(["min_guests", 1]);
  settingsSheet.appendRow(["booking_window_days", 45]);
  settingsSheet.getRange(1, 1, 1, 2).setFontWeight("bold").setBackground("#592F7C").setFontColor("#FFFFFF");

  Logger.log("✅ Master Sheet ('All Bookings' + Config) and 4 branch spreadsheets successfully initialized!");
}

/**
 * Retrieves all bookings matching a customer's phone number from Master & Branch spreadsheets
 */
function getBookingsForPhone(masterSS, searchPhone) {
  const cleanSearch = (searchPhone || '').toString().replace(/\D/g, '');
  const searchSuffix = cleanSearch.length >= 10 ? cleanSearch.slice(-10) : cleanSearch;
  const results = [];
  const seenIds = new Set();

  if (!masterSS) return results;

  // Sheets to search: Master "All Bookings", fallback "Bookings", or branch sheets
  const sheetsToSearch = [];
  const allSheet = masterSS.getSheetByName("All Bookings") || masterSS.getSheetByName("Bookings");
  if (allSheet) {
    sheetsToSearch.push(allSheet);
  } else {
    // If no All Bookings sheet, search each branch tab
    for (const key in LOCATION_SHEET_MAP) {
      const bSheet = masterSS.getSheetByName(LOCATION_SHEET_MAP[key]);
      if (bSheet) sheetsToSearch.push(bSheet);
    }
  }

  sheetsToSearch.forEach(sheet => {
    const data = sheet.getDataRange().getValues();
    // Iterate from newest (bottom) to oldest (top)
    for (let i = data.length - 1; i >= 1; i--) {
      const row = data[i];
      const bId = (row[0] || '').toString().trim();
      if (!bId || seenIds.has(bId)) continue;

      const rowPhone = (row[7] || '').toString().replace(/\D/g, '');
      const rowPhoneSuffix = rowPhone.length >= 10 ? rowPhone.slice(-10) : rowPhone;

      if (rowPhoneSuffix && searchSuffix && (rowPhoneSuffix === searchSuffix || rowPhone.indexOf(searchSuffix) !== -1 || cleanSearch.indexOf(rowPhoneSuffix) !== -1)) {
        seenIds.add(bId);

        let rowDate = (row[3] || '').toString().trim();
        if (row[3] instanceof Date) {
          rowDate = Utilities.formatDate(row[3], TIMEZONE, "yyyy-MM-dd");
        }

        let createdAtStr = (row[1] || '').toString().trim();
        if (row[1] instanceof Date) {
          createdAtStr = Utilities.formatDate(row[1], TIMEZONE, "yyyy-MM-dd HH:mm");
        }

        results.push({
          bookingId: bId,
          createdAt: createdAtStr,
          location: (row[2] || '').toString().trim(),
          date: rowDate,
          timeSlot: (row[4] || '').toString().trim(),
          name: (row[5] || '').toString().trim(),
          customerLocation: (row[6] || '').toString().trim(),
          whatsapp: (row[7] || '').toString().trim().replace(/^'/, ''),
          email: (row[8] || '').toString().trim(),
          occasion: (row[9] || '').toString().trim(),
          guests: parseInt(row[10], 10) || 1,
          additionalRequirements: (row[11] || '').toString().trim(),
          amenities: (row[12] || '').toString().trim(),
          combo: (row[13] || '').toString().trim(),
          status: (row[14] || 'CONFIRMED').toString().trim().toUpperCase()
        });
      }
    }
  });

  return results;
}

/**
 * Cancels a booking and updates status to CANCELLED in both Master & Branch spreadsheets
 */
function handleCancelBooking(body, masterSS) {
  const bookingId = (body.bookingId || body.booking_id || '').toString().trim();
  const rawPhone = (body.phone || body.whatsapp || '').toString().replace(/\D/g, '');
  const searchPhone = rawPhone.length >= 10 ? rawPhone.slice(-10) : rawPhone;

  if (!bookingId || !searchPhone) {
    return jsonResponse({
      success: false,
      error: "INVALID_PARAMS",
      message: "Both Booking ID and registered Phone number are required."
    });
  }

  let foundBooking = false;
  let targetLocation = '';

  // 1. Update in Master Spreadsheet
  if (masterSS) {
    const sheetsToCheck = [
      masterSS.getSheetByName("All Bookings"),
      masterSS.getSheetByName("Bookings")
    ].filter(Boolean);

    // Also include branch tabs in master if present
    for (const key in LOCATION_SHEET_MAP) {
      const s = masterSS.getSheetByName(LOCATION_SHEET_MAP[key]);
      if (s && !sheetsToCheck.includes(s)) sheetsToCheck.push(s);
    }

    for (const sheet of sheetsToCheck) {
      const data = sheet.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        const rowId = (data[i][0] || '').toString().trim();
        if (rowId === bookingId) {
          const rowPhone = (data[i][7] || '').toString().replace(/\D/g, '');
          const rowSuffix = rowPhone.length >= 10 ? rowPhone.slice(-10) : rowPhone;
          if (rowSuffix !== searchPhone && rowPhone.indexOf(searchPhone) === -1) {
            return jsonResponse({
              success: false,
              error: "PHONE_MISMATCH",
              message: "The phone number does not match the booking record."
            });
          }

          targetLocation = (data[i][2] || '').toString().trim();

          // Check if already cancelled
          const currentStatus = (data[i][14] || '').toString().trim().toUpperCase();
          if (currentStatus === 'CANCELLED') {
            return jsonResponse({
              success: false,
              error: "ALREADY_CANCELLED",
              message: "This celebration booking has already been cancelled."
            });
          }

          // Check minimum 2-hour advance cutoff rule
          let rowDate = (data[i][3] || '').toString().trim();
          if (data[i][3] instanceof Date) {
            rowDate = Utilities.formatDate(data[i][3], TIMEZONE, "yyyy-MM-dd");
          }
          const rowSlot = normalizeSlot(data[i][4]);
          const cancelCheck = isCancellationPermitted(rowDate, rowSlot);

          if (!cancelCheck.allowed) {
            return jsonResponse({
              success: false,
              error: "CANCELLATION_WINDOW_CLOSED",
              message: cancelCheck.reason || "Cannot cancel because it has passed the minimum 2-hour required notice for cancellation. Please contact Zelebrae staff directly on WhatsApp (85858 55859)."
            });
          }

          sheet.getRange(i + 1, 15).setValue("CANCELLED"); // Column O (status)
          foundBooking = true;
          break;
        }
      }
      if (foundBooking) break;
    }
  }

  // 2. Update in Dedicated Branch Spreadsheet (if separate)
  if (targetLocation) {
    const branchSS = getLocationSpreadsheet(targetLocation);
    if (branchSS && (!masterSS || branchSS.getId() !== masterSS.getId())) {
      const branchSheet = getBookingTargetSheet(branchSS, targetLocation);
      if (branchSheet) {
        const bData = branchSheet.getDataRange().getValues();
        for (let i = 1; i < bData.length; i++) {
          const rowId = (bData[i][0] || '').toString().trim();
          if (rowId === bookingId) {
            branchSheet.getRange(i + 1, 15).setValue("CANCELLED");
            break;
          }
        }
      }
    }
  }

  if (!foundBooking) {
    return jsonResponse({
      success: false,
      error: "BOOKING_NOT_FOUND",
      message: "Booking ID was not found or has already been removed."
    });
  }

  return jsonResponse({
    success: true,
    bookingId: bookingId,
    status: "CANCELLED",
    message: "Your celebration booking has been successfully cancelled. The slot has been released."
  });
}

/**
 * Checks whether a booking slot can be cancelled (minimum 2 hours in advance in Asia/Kolkata)
 */
function isCancellationPermitted(dateStr, slotStr) {
  if (!dateStr || !slotStr) return { allowed: true };

  var normSlot = normalizeSlot(slotStr);
  var m = normSlot.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!m) return { allowed: true };

  var hours = parseInt(m[1], 10);
  var minutes = m[2];
  var ampm = m[3].toUpperCase();

  if (ampm === 'AM') {
    if (hours === 12) hours = 0;
  } else if (ampm === 'PM') {
    if (hours !== 12) hours += 12;
  }

  var hhStr = hours < 10 ? '0' + hours : '' + hours;
  var parts = dateStr.trim().replace(/\//g, '-').split('-');
  if (parts.length === 3) {
    var y = parts[0];
    var mo = parts[1].length < 2 ? '0' + parts[1] : parts[1];
    var d = parts[2].length < 2 ? '0' + parts[2] : parts[2];
    var isoStr = y + '-' + mo + '-' + d + 'T' + hhStr + ':' + minutes + ':00+05:30';
    var slotTime = new Date(isoStr).getTime();
    var now = new Date().getTime();
    var diffHours = (slotTime - now) / (1000 * 60 * 60);

    if (diffHours <= 0) {
      return {
        allowed: false,
        hoursRemaining: diffHours,
        reason: "This celebration slot time has already passed."
      };
    }

    if (diffHours < 2) {
      return {
        allowed: false,
        hoursRemaining: diffHours,
        reason: "Cannot cancel because it has passed the minimum 2-hour required notice for cancellation."
      };
    }
  }

  return { allowed: true };
}

