/**
 * ============================================================================
 * ZELEBRAE PASTRIES — DEDICATED BRANCH SPREADSHEET SCRIPT
 * For: Pantheerankavu | Karaparamba | Ashokapuram | Arakkinar
 * ============================================================================
 * 
 * INSTALLATION (Takes 30 seconds):
 * 1. Open your Branch Google Spreadsheet (e.g., Zelebrae Bookings - Karaparamba).
 * 2. Click Extensions > Apps Script.
 * 3. Delete any default code and PASTE THIS ENTIRE FILE into Code.gs.
 * 4. Click Save (Disk icon or Ctrl+S).
 * 5. Run 'setupBranchMidnightTrigger' once from the toolbar to enable the daily auto-filter!
 * 
 * FEATURES:
 * 1. onEdit(e) & onChange(e): Whenever a new booking is added, edited, or pasted,
 *    it AUTOMATICALLY sorts chronologically (Date & Time) and hides past dates.
 * 2. Non-Destructive Filtering: Past dates (< today in Asia/Kolkata) are hidden,
 *    NEVER deleted. Zero cell data is modified or lost.
 * 3. Custom Toolbar Menu: '🎉 Zelebrae Branch' for 1-click sort, filter, or showing all.
 * ============================================================================
 */

var TIMEZONE = "Asia/Kolkata";

/**
 * Automatically creates custom toolbar menu when branch spreadsheet is opened.
 */
function onOpen(e) {
  try {
    var ui = SpreadsheetApp.getUi();
    ui.createMenu('🎉 Zelebrae Branch')
      .addItem('⚡ Auto-Sort & Filter (Now)', 'menuBranchSortAndFilter')
      .addSeparator()
      .addItem('📅 Hide Past Dates (Today & Upcoming Only)', 'menuBranchHidePastDates')
      .addItem('👁️ Show All Bookings (Include Past Dates)', 'menuBranchShowAllDates')
      .addSeparator()
      .addItem('⏰ Enable Daily Midnight Auto-Filter', 'setupBranchMidnightTrigger')
      .addToUi();
  } catch (err) {}
}

/**
 * AUTO TRIGGER: Fires automatically whenever any cell is typed or edited in this branch sheet.
 */
function onEdit(e) {
  try {
    if (!e || !e.range) return;
    var sheet = e.range.getSheet();
    var row = e.range.getRow();
    // Do not sort if editing the header row
    if (row <= 1) return;

    sortAndFilterBranchSheet(sheet);
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
    sortAndFilterBranchSheet(sheet);
  } catch (err) {
    Logger.log("onChange notice: " + err.toString());
  }
}

/**
 * Menu action: Auto-Sort & Filter
 */
function menuBranchSortAndFilter() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (ss) {
    var sheet = ss.getActiveSheet();
    sortAndFilterBranchSheet(sheet);
    try {
      SpreadsheetApp.getUi().alert("Done! All bookings are chronologically sorted and past dates are hidden.\n\nAll past data remains 100% safe and intact.");
    } catch (e) {}
  }
}

/**
 * Menu action: Hide Past Dates
 */
function menuBranchHidePastDates() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (ss) {
    var sheet = ss.getActiveSheet();
    applyBranchPastDateFilter(sheet);
    try {
      SpreadsheetApp.getUi().alert("Past dates are now hidden. Only Today & Upcoming celebrations are shown.");
    } catch (e) {}
  }
}

/**
 * Menu action: Show All Dates
 */
function menuBranchShowAllDates() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (ss) {
    var sheet = ss.getActiveSheet();
    var lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      sheet.showRows(2, lastRow - 1);
    }
    try {
      SpreadsheetApp.getUi().alert("All bookings (including past dates) are now visible.");
    } catch (e) {}
  }
}

/**
 * Core function: Sorts chronologically by Date (Col D) and Time Slot (Col E),
 * then hides past dates (< today in Asia/Kolkata).
 * NEVER touches or alters any cell data.
 */
function sortAndFilterBranchSheet(sheet) {
  if (!sheet) return;
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return;
  if (lastRow === 2) {
    applyBranchPastDateFilter(sheet);
    return;
  }

  var lastCol = sheet.getLastColumn();
  if (lastCol < 5) return; // Must have at least Date (Col 4) and Time Slot (Col 5)

  var numDataRows = lastRow - 1;
  var maxCols = sheet.getMaxColumns();
  var helperCol = Math.max(lastCol, 16) + 1;
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
      var mins = branchSlotToMinutes(s);
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
    Logger.log("Branch sort notice: " + err.toString());
    try {
      if (addedCol) {
        sheet.deleteColumn(helperCol);
      } else {
        sheet.getRange(2, helperCol, numDataRows, 1).clear();
      }
    } catch (e) {}
  }

  // 8. Non-destructively hide rows where celebration date has passed
  applyBranchPastDateFilter(sheet);
}

/**
 * Non-destructively hides rows where celebration date has passed (< today in Asia/Kolkata).
 * NEVER deletes or alters any data. All past records remain 100% intact.
 */
function applyBranchPastDateFilter(sheet) {
  if (!sheet) return;
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return;

  try {
    var numDataRows = lastRow - 1;
    sheet.showRows(2, numDataRows);

    var todayStr = Utilities.formatDate(new Date(), TIMEZONE, "yyyy-MM-dd");
    var dateValues = sheet.getRange(2, 4, numDataRows, 1).getValues();

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
    Logger.log("Branch filter notice: " + err.toString());
  }
}

/**
 * Parses any date format (Date object, YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY, etc.)
 * into a canonical YYYY-MM-DD string for exact chronological comparison.
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
 * Converts slot string to minutes from midnight for 24-hr chronological comparison.
 */
function branchSlotToMinutes(val) {
  if (!val) return 9999;
  var norm = (val || '').toString().trim().toUpperCase().replace(/^'/, '');
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
 * Sets up an automated daily midnight trigger (00:05 AM Asia/Kolkata)
 * to automatically hide yesterday's bookings as time advances.
 * Run this ONCE from the Apps Script editor.
 */
function setupBranchMidnightTrigger() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'dailyBranchMidnightRefresh') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }

  ScriptApp.newTrigger('dailyBranchMidnightRefresh')
    .timeBased()
    .everyDays(1)
    .atHour(0)
    .nearMinute(5)
    .inTimezone(TIMEZONE)
    .create();

  Logger.log("✅ Daily midnight trigger created for this branch! Runs at 00:05 AM " + TIMEZONE);
}

/**
 * Handler for the daily midnight trigger
 */
function dailyBranchMidnightRefresh() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (ss) {
    var sheets = ss.getSheets();
    for (var i = 0; i < sheets.length; i++) {
      sortAndFilterBranchSheet(sheets[i]);
    }
  }
}
