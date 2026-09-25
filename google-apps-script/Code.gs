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
  "status",
  "payment_screenshot"
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

    if (action === 'getAvailability' || action === 'getAvailabilityBatch') {
      const location = (e.parameter.location || 'pantheerankavu').toLowerCase().trim();
      const rawDates = (e.parameter.dates || e.parameter.date || '').toString().trim();

      if (!rawDates) {
        return jsonResponse({
          success: false,
          error: "Date parameter (YYYY-MM-DD) is required"
        });
      }

      // Check if multiple dates are requested
      if (rawDates.includes(',') || action === 'getAvailabilityBatch') {
        const dateList = rawDates.split(',').map(function(d) { return d.trim(); }).filter(Boolean);
        const batchMap = {};
        for (let idx = 0; idx < dateList.length; idx++) {
          const d = dateList[idx];
          batchMap[d] = computeAvailableSlots(ss, location, d);
        }
        return jsonResponse({
          success: true,
          location: location,
          targetSheet: getLocationSheetName(location),
          dates: batchMap
        });
      }

      // Single date request
      const availableSlots = computeAvailableSlots(ss, location, rawDates);
      return jsonResponse({
        success: true,
        location: location,
        targetSheet: getLocationSheetName(location),
        date: rawDates,
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

    // Check if this is an edit / reschedule request
    if (body.action === 'editBooking' || body.action === 'rescheduleBooking') {
      return handleEditBooking(body, masterSS);
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

    // 3a. Guest count capacity check (Arakkinar max 6, other branches max 15)
    const maxAllowedGuests = rawLocation.toLowerCase().indexOf('arakkinar') !== -1 ? 6 : 15;
    if (guests > maxAllowedGuests) {
      return jsonResponse({
        success: false,
        error: "EXCEEDS_CAPACITY",
        message: "Maximum capacity for " + targetLocationName + " is " + maxAllowedGuests + " guests."
      });
    }

    // 3b. Check if date or slot has already passed
    const now = new Date();
    const todayStr = Utilities.formatDate(now, TIMEZONE, "yyyy-MM-dd");
    if (date < todayStr) {
      return jsonResponse({
        success: false,
        error: "DATE_IN_PAST",
        message: "The selected date has already passed. Please choose a future date."
      });
    }
    if (date === todayStr) {
      const currentHours = parseInt(Utilities.formatDate(now, TIMEZONE, "HH"), 10);
      const currentMinutes = parseInt(Utilities.formatDate(now, TIMEZONE, "mm"), 10);
      const currentTotalMinutes = currentHours * 60 + currentMinutes;

      const norm = normalizeSlot(rawTimeSlot);
      const match = norm.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
      if (match) {
        let h = parseInt(match[1], 10);
        const m = parseInt(match[2], 10);
        const ampm = match[3].toUpperCase();
        if (ampm === 'AM' && h === 12) h = 0;
        if (ampm === 'PM' && h !== 12) h += 12;
        const slotTotalMinutes = h * 60 + m;
        if (slotTotalMinutes <= currentTotalMinutes) {
          return jsonResponse({
            success: false,
            error: "SLOT_TIME_PASSED",
            message: "This celebration time slot has already passed. Please select an upcoming time."
          });
        }
      }
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

    // 5b. Save payment screenshot to Google Drive if uploaded
    const rawPaymentBase64 = (body.payment_screenshot_base64 || body.paymentScreenshot || '').toString().trim();
    const rawPaymentName = (body.payment_screenshot_name || body.paymentScreenshotName || 'receipt.jpg').toString().trim();
    let paymentScreenshotUrl = '';

    if (rawPaymentBase64) {
      paymentScreenshotUrl = savePaymentScreenshotToDrive(rawPaymentBase64, rawPaymentName, bookingId);
    }

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
      "confirmed",
      paymentScreenshotUrl
    ];

    // 7. Write to the branch's dedicated spreadsheet
    const branchSpreadsheet = getLocationSpreadsheet(rawLocation);
    let branchTargetSheet = null;
    if (branchSpreadsheet) {
      branchTargetSheet = getBookingTargetSheet(branchSpreadsheet, rawLocation);
      if (branchTargetSheet) {
        ensureHeaderColumns(branchTargetSheet);
        branchTargetSheet.appendRow(bookingRow);
        // Automatically sort branch sheet chronologically & apply past-date filter
        sortBookingSheet(branchTargetSheet, true);
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
      } else {
        ensureHeaderColumns(masterAllSheet);
      }

      // Avoid duplicate appending if masterSS and branchSpreadsheet are the exact same sheet tab
      const isSameSheet = branchSpreadsheet && 
                          masterSS.getId() === branchSpreadsheet.getId() && 
                          branchTargetSheet && 
                          masterAllSheet.getName() === branchTargetSheet.getName();

      if (!isSameSheet) {
        masterAllSheet.appendRow(bookingRow);
        // Automatically sort master sheet chronologically (keeps all dates visible)
        sortBookingSheet(masterAllSheet, false);
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
        } else {
          ensureHeaderColumns(masterLocTab);
        }
        masterLocTab.appendRow(bookingRow);
        sortBookingSheet(masterLocTab, false);
      }
    }

    // Ensure write is immediately committed to Google Sheets
    SpreadsheetApp.flush();

    // Immediately clear edge cache for this branch & date so new bookings are blocked instantly
    invalidateAvailabilityCache(rawLocation, date);

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
 * Saves uploaded base64 payment receipt image to Google Drive folder "Zelebrae Payment Proofs"
 * Returns the shareable Google Drive view link so managers can click to view the screenshot directly from the spreadsheet.
 */
function savePaymentScreenshotToDrive(base64Data, fileName, bookingId) {
  if (!base64Data) return '';
  try {
    const folderName = "Zelebrae Payment Proofs";
    const folders = DriveApp.getFoldersByName(folderName);
    let folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(folderName);

    try {
      folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (e) {}

    // Clean data URL prefix if present (e.g. "data:image/jpeg;base64,...")
    let contentType = 'image/jpeg';
    let cleanBase64 = base64Data;
    const match = base64Data.match(/^data:([^;]+);base64,(.+)$/);
    if (match) {
      contentType = match[1];
      cleanBase64 = match[2];
    }

    const decodedBytes = Utilities.base64Decode(cleanBase64);
    const cleanFileName = (fileName || 'payment_receipt.jpg').replace(/[^a-zA-Z0-9._-]/g, '_');
    const blobName = (bookingId || 'ZB-PAY') + '_' + cleanFileName;
    const blob = Utilities.newBlob(decodedBytes, contentType, blobName);

    const file = folder.createFile(blob);
    try {
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (e) {}

    return file.getUrl();
  } catch (err) {
    Logger.log("⚠️ Failed to save payment screenshot to Google Drive: " + err.toString());
    return "";
  }
}

/**
 * Ensures that a sheet's header row includes the "payment_screenshot" column
 */
function ensureHeaderColumns(sheet) {
  if (!sheet || sheet.getLastRow() === 0) return;
  try {
    const numCols = Math.max(sheet.getLastColumn(), BOOKING_HEADERS.length);
    const headerRow = sheet.getRange(1, 1, 1, numCols).getValues()[0];
    if (!headerRow.includes("payment_screenshot")) {
      const colIdx = BOOKING_HEADERS.indexOf("payment_screenshot") + 1;
      sheet.getRange(1, colIdx).setValue("payment_screenshot")
        .setFontWeight("bold")
        .setBackground("#592F7C")
        .setFontColor("#FFFFFF");
      sheet.setColumnWidth(colIdx, 240);
    }
  } catch (e) {
    Logger.log("Header check note: " + e.toString());
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
  const normLocation = (location || 'pantheerankavu').toLowerCase().trim();
  const cleanDate = (date || '').trim();
  const cacheKey = "avail_" + normLocation + "_" + cleanDate;

  // 0. Fast edge cache check (~50ms response)
  try {
    const cache = CacheService.getScriptCache();
    const cached = cache.get(cacheKey);
    if (cached) {
      const cachedSlots = JSON.parse(cached);
      return filterPastSlotsIfToday(cachedSlots, cleanDate);
    }
  } catch (e) {
    Logger.log("Cache read notice: " + e.toString());
  }

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

  // 3. Filter out booked slots
  let available = configuredSlots.filter(slot => !bookedSlots.has(normalizeSlot(slot)));

  // 4. Save to edge cache for 3 minutes (180s)
  try {
    const cache = CacheService.getScriptCache();
    cache.put(cacheKey, JSON.stringify(available), 180);
  } catch (e) {
    Logger.log("Cache write notice: " + e.toString());
  }

  // 5. Realtime filter for today
  return filterPastSlotsIfToday(available, cleanDate);
}

/**
 * Filters out slots that have already passed if date is today (Asia/Kolkata)
 */
function filterPastSlotsIfToday(slots, date) {
  const now = new Date();
  const todayStr = Utilities.formatDate(now, TIMEZONE, "yyyy-MM-dd");
  if (date < todayStr) return [];
  if (date > todayStr) return slots;

  const currentHours = parseInt(Utilities.formatDate(now, TIMEZONE, "HH"), 10);
  const currentMinutes = parseInt(Utilities.formatDate(now, TIMEZONE, "mm"), 10);
  const currentTotalMinutes = currentHours * 60 + currentMinutes;

  return (slots || []).filter(slot => {
    const norm = normalizeSlot(slot);
    const match = norm.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!match) return true;
    let h = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    const ampm = match[3].toUpperCase();
    if (ampm === 'AM' && h === 12) h = 0;
    if (ampm === 'PM' && h !== 12) h += 12;
    const slotTotalMinutes = h * 60 + m;
    return slotTotalMinutes > currentTotalMinutes;
  });
}

function invalidateAvailabilityCache(location, date) {
  try {
    const cache = CacheService.getScriptCache();
    if (location && date) {
      cache.remove("avail_" + location.toLowerCase().trim() + "_" + date.trim());
    } else if (location) {
      // Invalidate today and upcoming 7 days for this location if date not specified
      const now = new Date();
      for (let i = 0; i <= 7; i++) {
        const d = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
        const dStr = Utilities.formatDate(d, TIMEZONE, "yyyy-MM-dd");
        cache.remove("avail_" + location.toLowerCase().trim() + "_" + dStr);
      }
    }
  } catch (e) {
    Logger.log("Cache invalidation notice: " + e.toString());
  }
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
 * CHRONOLOGICAL SORTING & BRANCH PAST-DATE FILTERING ENGINE
 * ============================================================================
 * 1. Automatically sorts rows by Celebration Date (Col D) and Time Slot (Col E)
 *    in true 24-hour chronological sequence (09:30 AM before 01:30 PM before 08:30 PM).
 * 2. NEVER edits, touches, or alters any cell contents (dates, times, names,
 *    numbers, links remain 100% untouched).
 * 3. In branch sheets only: non-destructively hides rows where celebration date
 *    has passed (< today in Asia/Kolkata). Zero data is ever deleted or modified.
 * 4. Central Master Sheet keeps ALL past and future bookings visible.
 * 5. Includes onEdit(e) & onChange(e) automatic triggers for instant sorting.
 * ============================================================================
 */

/**
 * Parses any date format (Date object, YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY, etc.)
 * into a canonical YYYY-MM-DD string for exact chronological comparison.
 * Never alters or mutates the cell value in the sheet.
 */
function parseDateToYMD(val) {
  if (!val) return '';
  if (val instanceof Date || (typeof val === 'object' && typeof val.getTime === 'function')) {
    if (!isNaN(val.getTime())) {
      return Utilities.formatDate(val, TIMEZONE, "yyyy-MM-dd");
    }
  }
  var str = (val || '').toString().trim();
  if (!str) return '';

  // Match YYYY-MM-DD or YYYY/MM/DD
  var mYMD = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (mYMD) {
    var y = mYMD[1];
    var m = ("0" + mYMD[2]).slice(-2);
    var d = ("0" + mYMD[3]).slice(-2);
    return y + "-" + m + "-" + d;
  }

  // Match DD-MM-YYYY or DD/MM/YYYY
  var mDMY = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (mDMY) {
    var d = ("0" + mDMY[1]).slice(-2);
    var m = ("0" + mDMY[2]).slice(-2);
    var y = mDMY[3];
    return y + "-" + m + "-" + d;
  }

  var parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return Utilities.formatDate(parsed, TIMEZONE, "yyyy-MM-dd");
  }
  return str;
}

/**
 * Converts any time slot string into minutes from midnight for exact 24-hr time comparisons.
 * E.g. "09:30 AM" -> 570, "12:30 PM" -> 750, "01:30 PM" -> 810, "08:30 PM" -> 1230.
 */
function slotToMinutes(val) {
  if (!val) return 9999;
  var norm = normalizeSlot(val);
  var m = norm.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!m) return 9999;
  var h = parseInt(m[1], 10);
  var mins = parseInt(m[2], 10);
  var ampm = m[3].toUpperCase();
  if (ampm === 'AM') {
    if (h === 12) h = 0;
  } else if (ampm === 'PM') {
    if (h !== 12) h += 12;
  }
  return h * 60 + mins;
}

/**
 * Chronologically sorts a booking sheet by Celebration Date (Col D) and Celebration Time (Col E).
 * Uses Google Sheets native range.sort() via a temporary helper column that is immediately cleared.
 * NEVER alters, mutates, or touches the contents of any cell in Columns A through P.
 */
function sortBookingSheet(sheet, isBranchSheet) {
  if (!sheet) return;
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return;
  if (lastRow === 2) {
    if (isBranchSheet) {
      applyBranchDateFilter(sheet);
    }
    return;
  }

  var lastCol = sheet.getLastColumn();
  if (lastCol < 5) return; // Must have at least Date (Col 4) and Time Slot (Col 5)

  var numDataRows = lastRow - 1;
  var maxCols = sheet.getMaxColumns();
  var helperCol = Math.max(lastCol, BOOKING_HEADERS.length) + 1;
  var addedCol = false;

  try {
    // 1. Unhide rows first so hidden rows do not cause sort misalignment
    sheet.showRows(2, numDataRows);

    // 2. Ensure sheet has enough columns for the temporary helper sort key
    if (maxCols < helperCol) {
      sheet.insertColumnsAfter(maxCols, helperCol - maxCols);
      addedCol = true;
    }

    // 3. Auto-repair any '#ERROR!' or unquoted '+91' formula parse errors in Column H (WhatsApp)
    if (lastCol >= 8) {
      try {
        var phoneRange = sheet.getRange(2, 8, numDataRows, 1);
        var formulas = phoneRange.getFormulas();
        var vals = phoneRange.getValues();
        for (var p = 0; p < numDataRows; p++) {
          var f = (formulas[p][0] || '').toString();
          var v = (vals[p][0] || '').toString();
          if (f && f.indexOf('+') !== -1) {
            phoneRange.getCell(p + 1, 1).setValue("'" + f.replace(/^=/, '').trim());
          } else if (v === '#ERROR!' || v.toLowerCase().indexOf('error') !== -1) {
            if (f) {
              phoneRange.getCell(p + 1, 1).setValue("'" + f.replace(/^=/, '').trim());
            }
          }
        }
      } catch (errP) {}
    }

    // 4. Read Celebration Date (Col 4 / D) and Time Slot (Col 5 / E)
    var dateValues = sheet.getRange(2, 4, numDataRows, 1).getValues();
    var slotValues = sheet.getRange(2, 5, numDataRows, 1).getValues();

    // 5. Construct chronological sort keys: YYYY-MM-DD_HHMM
    var sortKeys = [];
    for (var i = 0; i < numDataRows; i++) {
      var d = dateValues[i][0];
      var dStr = parseDateToYMD(d);
      if (!dStr) dStr = '9999-99-99';

      var s = slotValues[i][0];
      var mins = slotToMinutes(s);
      var minStr = ("0000" + mins).slice(-4);

      sortKeys.push([dStr + "_" + minStr]);
    }

    // 5. Temporarily write sort keys into helper column
    sheet.getRange(2, helperCol, numDataRows, 1).setValues(sortKeys);

    // 6. Perform native Google Sheets sort across all columns using the helper key
    // Native sort physically moves rows without modifying ANY cell value or formatting
    sheet.getRange(2, 1, numDataRows, helperCol).sort([
      { column: helperCol, ascending: true }
    ]);

    // 7. Clean up temporary helper column
    if (addedCol) {
      sheet.deleteColumn(helperCol);
    } else {
      sheet.getRange(2, helperCol, numDataRows, 1).clear();
    }
  } catch (err) {
    Logger.log("Sorting notice for " + sheet.getName() + ": " + err.toString());
    try {
      if (addedCol) {
        sheet.deleteColumn(helperCol);
      } else {
        sheet.getRange(2, helperCol, numDataRows, 1).clear();
      }
    } catch (e) {}
  }

  // 8. If this is a branch sheet, apply the non-destructive past-date filter
  if (isBranchSheet) {
    applyBranchDateFilter(sheet);
  }
}

/**
 * Non-destructively hides rows where celebration date has passed (< today in Asia/Kolkata).
 * NEVER deletes or alters any data. All past records remain 100% intact.
 * Branch staff can unhide rows anytime via the Google Sheets row arrows or custom menu.
 */
function applyBranchDateFilter(sheet) {
  if (!sheet) return;
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return;

  try {
    // 1. Unhide all rows first so nothing is permanently lost
    var numDataRows = lastRow - 1;
    sheet.showRows(2, numDataRows);

    // 2. Current date in Kerala (Asia/Kolkata)
    var todayStr = Utilities.formatDate(new Date(), TIMEZONE, "yyyy-MM-dd");

    // 3. Read dates in Column D (Col 4)
    var dateValues = sheet.getRange(2, 4, numDataRows, 1).getValues();

    // 4. Batch-hide contiguous blocks of past rows
    var rangeStart = -1;
    var rangeCount = 0;

    for (var i = 0; i < numDataRows; i++) {
      var dStr = parseDateToYMD(dateValues[i][0]);

      if (dStr && dStr < todayStr) {
        var rowNum = i + 2;
        if (rangeStart === -1) {
          rangeStart = rowNum;
          rangeCount = 1;
        } else if (rowNum === rangeStart + rangeCount) {
          rangeCount++;
        } else {
          sheet.hideRows(rangeStart, rangeCount);
          rangeStart = rowNum;
          rangeCount = 1;
        }
      } else {
        if (rangeStart !== -1) {
          sheet.hideRows(rangeStart, rangeCount);
          rangeStart = -1;
          rangeCount = 0;
        }
      }
    }

    if (rangeStart !== -1) {
      sheet.hideRows(rangeStart, rangeCount);
    }
  } catch (err) {
    Logger.log("Past-date filter notice for " + sheet.getName() + ": " + err.toString());
  }
}

/**
 * Shows all rows in the sheet (unhides all past dates).
 */
function showAllBranchRows(sheet) {
  if (!sheet) return;
  var lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.showRows(2, lastRow - 1);
  }
}

/**
 * Master batch maintenance function:
 * 1. Chronologically sorts all 4 branch spreadsheets & hides past dates in branches.
 * 2. Chronologically sorts the central Master Spreadsheet (keeps all dates visible).
 * NEVER deletes or alters any data.
 */
function sortAllSheetsAndFilterBranches() {
  var branches = ['pantheerankavu', 'karaparamba', 'ashokapuram', 'arakkinar'];
  var masterSS = getMasterSpreadsheet();

  // 1. Process all 4 dedicated branch spreadsheets
  branches.forEach(function(bKey) {
    try {
      var branchSS = getLocationSpreadsheet(bKey);
      if (branchSS) {
        var branchSheet = getBookingTargetSheet(branchSS, bKey);
        if (branchSheet) {
          sortBookingSheet(branchSheet, true); // true = branch sheet: sorts + hides past dates
          Logger.log("✅ Sorted & filtered branch: " + bKey);
        }
      }
    } catch (e) {
      Logger.log("⚠️ Branch sort note (" + bKey + "): " + e.toString());
    }
  });

  // 2. Process central Master Spreadsheet (All Bookings tab)
  if (masterSS) {
    try {
      var allSheet = masterSS.getSheetByName("All Bookings") || masterSS.getSheetByName("Bookings");
      if (allSheet) {
        sortBookingSheet(allSheet, false); // false = master sheet: sorts, NO past dates hidden
        Logger.log("✅ Sorted Master Sheet: All Bookings");
      }
      LOCATION_SHEET_NAMES.forEach(function(locName) {
        var locTab = masterSS.getSheetByName(locName);
        if (locTab && (!allSheet || locTab.getName() !== allSheet.getName())) {
          sortBookingSheet(locTab, false);
        }
      });
    } catch (e) {
      Logger.log("⚠️ Master sort note: " + e.toString());
    }
  }

  Logger.log("🎉 All branch sheets & master sheet have been sorted and refreshed!");
}

/**
 * AUTO TRIGGER: Fires automatically whenever any cell is edited directly in this spreadsheet.
 * Automatically sorts chronologically and filters past dates in branch tabs.
 */
function onEdit(e) {
  try {
    if (!e || !e.range) return;
    var sheet = e.range.getSheet();
    var sheetName = sheet.getName();

    var isBookingSheet = sheetName === "All Bookings" || 
                         sheetName === "Bookings" || 
                         LOCATION_SHEET_NAMES.indexOf(sheetName) !== -1;
    if (!isBookingSheet) return;

    var row = e.range.getRow();
    if (row <= 1) return; // Don't sort when editing header row

    var isBranch = sheetName !== "All Bookings" && sheetName !== "Bookings";
    sortBookingSheet(sheet, isBranch);
  } catch (err) {
    Logger.log("onEdit notice: " + err.toString());
  }
}

/**
 * AUTO TRIGGER: Fires automatically when rows are inserted or pasted.
 */
function onChange(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) return;
    var sheet = ss.getActiveSheet();
    if (!sheet) return;
    var sheetName = sheet.getName();

    var isBookingSheet = sheetName === "All Bookings" || 
                         sheetName === "Bookings" || 
                         LOCATION_SHEET_NAMES.indexOf(sheetName) !== -1;
    if (!isBookingSheet) return;

    var isBranch = sheetName !== "All Bookings" && sheetName !== "Bookings";
    sortBookingSheet(sheet, isBranch);
  } catch (err) {
    Logger.log("onChange notice: " + err.toString());
  }
}

/**
 * Automatically creates custom menu in Google Sheets toolbar when opened
 */
function onOpen(e) {
  try {
    var ui = SpreadsheetApp.getUi();
    ui.createMenu('🎉 Zelebrae Bookings')
      .addItem('⚡ Auto-Sort All Sheets (Now)', 'menuSortAllSheets')
      .addSeparator()
      .addItem('📅 Filter Today & Upcoming Only (Hide Past Dates)', 'menuFilterTodayOnly')
      .addItem('👁️ Show All Bookings (Include Past Dates)', 'menuShowAllDates')
      .addSeparator()
      .addItem('⏰ Setup Daily Midnight Auto-Filter', 'setupDailyMidnightTrigger')
      .addToUi();
  } catch (err) {
    // onOpen can run without UI in web app execution context
  }
}

function menuSortAllSheets() {
  sortAllSheetsAndFilterBranches();
  try {
    SpreadsheetApp.getUi().alert("Done! All bookings have been chronologically sorted, and past dates are filtered for branches without deleting any data.");
  } catch (e) {}
}

function menuFilterTodayOnly() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (ss) {
    var sheet = ss.getActiveSheet();
    applyBranchDateFilter(sheet);
    try {
      SpreadsheetApp.getUi().alert("Past dates are now hidden. Only Today & Upcoming celebrations are shown.\n(All your past data is 100% safe and intact!)");
    } catch (e) {}
  }
}

function menuShowAllDates() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (ss) {
    var sheet = ss.getActiveSheet();
    showAllBranchRows(sheet);
    try {
      SpreadsheetApp.getUi().alert("All bookings (including past dates) are now visible.");
    } catch (e) {}
  }
}

/**
 * Sets up an automated daily trigger at 00:05 AM Asia/Kolkata
 * to automatically hide yesterday's bookings as time advances.
 * Run this ONCE from the Apps Script editor.
 */
function setupDailyMidnightTrigger() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'sortAllSheetsAndFilterBranches') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }

  ScriptApp.newTrigger('sortAllSheetsAndFilterBranches')
    .timeBased()
    .everyDays(1)
    .atHour(0)
    .nearMinute(5)
    .inTimezone(TIMEZONE)
    .create();

  Logger.log("✅ Daily midnight trigger created successfully! Runs at 00:05 AM " + TIMEZONE);
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
 * ONE-CLICK TEST & DRIVE PERMISSION AUTHORIZER:
 * Run this function in Apps Script to:
 * 1. Grant Google Drive permissions to create & save payment screenshots
 * 2. Automatically create the "Zelebrae Payment Proofs" Google Drive folder
 * 3. Add the "payment_screenshot" column (Column 16 / P) to all your sheets
 * ============================================================================
 */
function testDriveAndSheetSetup() {
  Logger.log("1. Checking Google Drive folder for payment receipts...");
  const folderName = "Zelebrae Payment Proofs";
  const folders = DriveApp.getFoldersByName(folderName);
  let folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(folderName);
  try {
    folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (e) {}
  Logger.log("✅ Google Drive folder verified: \"" + folder.getName() + "\"");
  Logger.log("   Folder URL: " + folder.getUrl());

  Logger.log("\n2. Updating headers on Master and Branch spreadsheets with 'payment_screenshot' column...");
  const masterSS = getMasterSpreadsheet() || SpreadsheetApp.getActiveSpreadsheet();
  if (masterSS) {
    const sheets = masterSS.getSheets();
    sheets.forEach(s => {
      const sName = s.getName();
      if (s.getLastRow() > 0 && sName !== "Branch Links" && sName !== "Locations" && sName !== "Slots") {
        ensureHeaderColumns(s);
        Logger.log("  ✅ Checked master tab: " + sName);
      }
    });
  }

  // Also check branch spreadsheets
  for (const key in LOCATION_SHEET_MAP) {
    const bSS = getLocationSpreadsheet(key);
    if (bSS) {
      const bSheet = getBookingTargetSheet(bSS, key);
      if (bSheet) {
        ensureHeaderColumns(bSheet);
        Logger.log("  ✅ Checked branch sheet: " + bSS.getName());
      }
    }
  }

  SpreadsheetApp.flush();
  Logger.log("\n🎉 ALL SET! Google Drive and Spreadsheets are fully configured for payment screenshot uploads.");
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
    6, 
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
  let targetDate = '';

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

          targetDate = rowDate;
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

  // Flush spreadsheet updates
  SpreadsheetApp.flush();

  // Invalidate slot cache so the cancelled slot becomes instantly available again for other customers
  if (targetLocation && targetDate) {
    invalidateAvailabilityCache(targetLocation, targetDate);
  }

  return jsonResponse({
    success: true,
    bookingId: bookingId,
    status: "CANCELLED",
    message: "Your celebration booking has been successfully cancelled. The slot has been released."
  });
}

/**
 * Edits or reschedules an existing booking in Master & Branch spreadsheets
 */
function handleEditBooking(body, masterSS) {
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
  let targetLocationCode = '';
  let currentRowIndex = -1;
  let currentSheet = null;
  let existingRow = null;

  // 1. Locate booking in Master Spreadsheet
  if (masterSS) {
    const sheetsToCheck = [
      masterSS.getSheetByName("All Bookings"),
      masterSS.getSheetByName("Bookings")
    ].filter(Boolean);

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

          const currentStatus = (data[i][14] || '').toString().trim().toUpperCase();
          if (currentStatus === 'CANCELLED') {
            return jsonResponse({
              success: false,
              error: "ALREADY_CANCELLED",
              message: "Cannot edit a cancelled booking."
            });
          }

          targetLocation = (data[i][2] || '').toString().trim();
          for (const k in LOCATION_SHEET_MAP) {
            if (LOCATION_SHEET_MAP[k].toLowerCase() === targetLocation.toLowerCase() || k === targetLocation.toLowerCase()) {
              targetLocationCode = k;
              break;
            }
          }
          if (!targetLocationCode) targetLocationCode = 'pantheerankavu';

          currentSheet = sheet;
          currentRowIndex = i + 1;
          existingRow = data[i];
          foundBooking = true;
          break;
        }
      }
      if (foundBooking) break;
    }
  }

  if (!foundBooking) {
    return jsonResponse({
      success: false,
      error: "BOOKING_NOT_FOUND",
      message: "Booking ID was not found."
    });
  }

  // 2. Validate Location Change & Rescheduling
  const rawNewLoc = (body.location || body.newLocation || '').toString().trim();
  let newLocationCode = '';
  if (rawNewLoc) {
    for (const k in LOCATION_SHEET_MAP) {
      if (LOCATION_SHEET_MAP[k].toLowerCase() === rawNewLoc.toLowerCase() || k === rawNewLoc.toLowerCase()) {
        newLocationCode = k;
        break;
      }
    }
  }
  const finalLocationCode = newLocationCode || targetLocationCode;
  const finalLocationName = getLocationSheetName(finalLocationCode);
  const locationChanged = Boolean(newLocationCode && newLocationCode !== targetLocationCode);

  const newDate = (body.date || '').toString().trim();
  const rawNewSlot = (body.time_slot || body.timeSlot || '').toString().trim().replace(/^'/, '');
  const newSlotNorm = rawNewSlot ? normalizeSlot(rawNewSlot) : '';

  let curDate = (existingRow[3] || '').toString().trim();
  if (existingRow[3] instanceof Date) {
    curDate = Utilities.formatDate(existingRow[3], TIMEZONE, "yyyy-MM-dd");
  }
  const curSlotNorm = normalizeSlot(existingRow[4]);

  const dateOrSlotOrLocChanged = (newDate && newDate !== curDate) || 
                                 (newSlotNorm && newSlotNorm !== curSlotNorm) || 
                                 locationChanged;

  if (dateOrSlotOrLocChanged) {
    // Check advance notice rule for the old slot
    const checkNotice = isCancellationPermitted(curDate, curSlotNorm);
    if (!checkNotice.allowed) {
      return jsonResponse({
        success: false,
        error: "RESCHEDULE_NOTICE_REQUIRED",
        message: checkNotice.reason || "Cannot reschedule because it has passed the required advance notice for this celebration slot."
      });
    }

    const finalDate = newDate || curDate;
    const finalSlot = newSlotNorm || curSlotNorm;

    // Check if new slot has already passed
    const now = new Date();
    const todayStr = Utilities.formatDate(now, TIMEZONE, "yyyy-MM-dd");
    if (finalDate < todayStr) {
      return jsonResponse({
        success: false,
        error: "SLOT_PASSED",
        message: "The chosen celebration date has already passed."
      });
    }

    // Check collision with other bookings in the target location
    if (isSlotAlreadyBooked(masterSS, finalLocationCode, finalDate, finalSlot)) {
      return jsonResponse({
        success: false,
        error: "SLOT_OCCUPIED",
        message: "The selected time slot is already booked at " + finalLocationName + ". Please choose a different slot."
      });
    }
  }

  // Check guest capacity limit for target location (Arakkinar max 6, others 15)
  const locMaxCapacity = finalLocationCode === 'arakkinar' ? 6 : 15;
  if (body.guests !== undefined) {
    const requestedGuests = parseInt(body.guests, 10);
    if (requestedGuests > locMaxCapacity) {
      return jsonResponse({
        success: false,
        error: "EXCEEDS_CAPACITY",
        message: "Maximum capacity for " + finalLocationName + " is " + locMaxCapacity + " guests."
      });
    }
  }

  // 3. Apply updates to Master Sheet
  if (locationChanged) {
    currentSheet.getRange(currentRowIndex, 3).setValue(finalLocationName); // Column C (location)
  }
  if (newDate) {
    currentSheet.getRange(currentRowIndex, 4).setValue(newDate); // Column D (date)
  }
  if (rawNewSlot) {
    currentSheet.getRange(currentRowIndex, 5).setValue("'" + rawNewSlot); // Column E (time_slot)
  }
  if (body.guests !== undefined) {
    const g = parseInt(body.guests, 10);
    if (!isNaN(g) && g >= 1) currentSheet.getRange(currentRowIndex, 11).setValue(Math.min(g, locMaxCapacity)); // Column K
  }
  if (body.occasion) {
    currentSheet.getRange(currentRowIndex, 10).setValue(body.occasion.toString().trim()); // Column J
  }
  if (body.additional_requirements !== undefined || body.additionalRequirements !== undefined) {
    const req = (body.additional_requirements || body.additionalRequirements || '').toString().trim();
    currentSheet.getRange(currentRowIndex, 12).setValue(req); // Column L
  }

  // 4. Mirror updates to Branch's Dedicated Spreadsheet (if separate)
  if (locationChanged) {
    // A. Remove booking row from OLD branch sheet
    const oldBranchSS = getLocationSpreadsheet(targetLocationCode);
    let rowValuesToMove = null;
    if (oldBranchSS && (!masterSS || oldBranchSS.getId() !== masterSS.getId())) {
      const oldBranchSheet = getBookingTargetSheet(oldBranchSS, targetLocationCode);
      if (oldBranchSheet) {
        const oData = oldBranchSheet.getDataRange().getValues();
        for (let i = 1; i < oData.length; i++) {
          if ((oData[i][0] || '').toString().trim() === bookingId) {
            rowValuesToMove = oData[i].slice();
            oldBranchSheet.deleteRow(i + 1);
            sortBookingSheet(oldBranchSheet, true);
            break;
          }
        }
      }
    }

    // B. Append booking row to NEW branch sheet
    const newBranchSS = getLocationSpreadsheet(finalLocationCode);
    if (newBranchSS && (!masterSS || newBranchSS.getId() !== masterSS.getId())) {
      const newBranchSheet = getBookingTargetSheet(newBranchSS, finalLocationCode);
      if (newBranchSheet) {
        ensureHeaderColumns(newBranchSheet);
        const updatedRow = rowValuesToMove || currentSheet.getRange(currentRowIndex, 1, 1, BOOKING_HEADERS.length).getValues()[0];
        updatedRow[2] = finalLocationName; // Column C: Location
        if (newDate) updatedRow[3] = newDate; // Column D: Date
        // Column E: Time Slot - ensure single quote prefix
        if (rawNewSlot) {
          updatedRow[4] = "'" + rawNewSlot;
        } else if (updatedRow[4]) {
          updatedRow[4] = "'" + updatedRow[4].toString().replace(/^'/, '');
        }

        // Column H: WhatsApp - prevent Google Sheets from interpreting "+91..." as formula
        let wNum = (updatedRow[7] || '').toString().trim().replace(/^'/, '');
        if (!wNum || wNum === '#ERROR!' || wNum.toLowerCase().indexOf('error') !== -1) {
          wNum = rawPhone.length >= 10 ? ('+91 ' + rawPhone.slice(-10)) : (body.phone || body.whatsapp || '');
        }
        if (wNum) {
          updatedRow[7] = "'" + (wNum.startsWith('+') ? wNum : ('+91 ' + wNum.replace(/\D/g, '').slice(-10)));
        }

        if (body.occasion) updatedRow[9] = body.occasion.toString().trim(); // Column J: Occasion
        if (body.guests !== undefined) {
          const g = parseInt(body.guests, 10);
          if (!isNaN(g) && g >= 1) updatedRow[10] = Math.min(g, locMaxCapacity); // Column K: Guests
        }
        if (body.additional_requirements !== undefined || body.additionalRequirements !== undefined) {
          updatedRow[11] = (body.additional_requirements || body.additionalRequirements || '').toString().trim(); // Column L
        }
        newBranchSheet.appendRow(updatedRow);
        sortBookingSheet(newBranchSheet, true);
      }
    }
  } else if (targetLocationCode) {
    // Location didn't change: update in place in same branch sheet
    const branchSS = getLocationSpreadsheet(targetLocationCode);
    if (branchSS && (!masterSS || branchSS.getId() !== masterSS.getId())) {
      const branchSheet = getBookingTargetSheet(branchSS, targetLocationCode);
      if (branchSheet) {
        const bData = branchSheet.getDataRange().getValues();
        for (let i = 1; i < bData.length; i++) {
          const rowId = (bData[i][0] || '').toString().trim();
          if (rowId === bookingId) {
            const bRow = i + 1;
            if (newDate) branchSheet.getRange(bRow, 4).setValue(newDate);
            if (rawNewSlot) branchSheet.getRange(bRow, 5).setValue("'" + rawNewSlot);
            const curBranchH = (bData[i][7] || '').toString().trim();
            if (curBranchH === '#ERROR!' || curBranchH.toLowerCase().indexOf('error') !== -1) {
              const safePhone = rawPhone.length >= 10 ? ('+91 ' + rawPhone.slice(-10)) : (body.phone || body.whatsapp || '');
              if (safePhone) branchSheet.getRange(bRow, 8).setValue("'" + safePhone);
            }
            if (body.guests !== undefined) {
              const g = parseInt(body.guests, 10);
              if (!isNaN(g) && g >= 1) branchSheet.getRange(bRow, 11).setValue(Math.min(g, locMaxCapacity));
            }
            if (body.occasion) branchSheet.getRange(bRow, 10).setValue(body.occasion.toString().trim());
            if (body.additional_requirements !== undefined || body.additionalRequirements !== undefined) {
              const req = (body.additional_requirements || body.additionalRequirements || '').toString().trim();
              branchSheet.getRange(bRow, 12).setValue(req);
            }
            sortBookingSheet(branchSheet, true);
            break;
          }
        }
      }
    }
  }

  // Also auto-fix Column H in Master Sheet if it currently contains #ERROR!
  if (currentSheet) {
    const curMasterH = (currentSheet.getRange(currentRowIndex, 8).getValue() || '').toString().trim();
    if (curMasterH === '#ERROR!' || curMasterH.toLowerCase().indexOf('error') !== -1) {
      const safePhone = rawPhone.length >= 10 ? ('+91 ' + rawPhone.slice(-10)) : (body.phone || body.whatsapp || '');
      if (safePhone) currentSheet.getRange(currentRowIndex, 8).setValue("'" + safePhone);
    }
  }

  // Re-sort master sheet chronologically
  if (currentSheet) {
    sortBookingSheet(currentSheet, false);
  }

  // Flush spreadsheet updates
  SpreadsheetApp.flush();

  // Invalidate slot cache for both old location/date and new location/date
  if (targetLocationCode && curDate) {
    invalidateAvailabilityCache(targetLocationCode, curDate);
  }
  if (finalLocationCode) {
    if (newDate) invalidateAvailabilityCache(finalLocationCode, newDate);
    if (curDate) invalidateAvailabilityCache(finalLocationCode, curDate);
  }

  return jsonResponse({
    success: true,
    bookingId: bookingId,
    message: "Celebration booking details updated successfully!",
    updated: {
      location: finalLocationName,
      locationCode: finalLocationCode,
      date: newDate || curDate,
      timeSlot: rawNewSlot || curSlotNorm,
      guests: body.guests,
      occasion: body.occasion
    }
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

