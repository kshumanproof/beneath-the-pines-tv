/**
 * Family Tradition — screener request receiver (Google Apps Script).
 *
 * Bound to the "Family Tradition Screener Requests" Google Sheet.
 * Receives the form on beneaththepinestv.com/family-tradition, assigns a
 * sequential Request ID (FT-0001, FT-0002, ...), logs a row, and emails Kris.
 * It never grants access; approval + Vimeo review links stay manual.
 *
 * Setup: see apps-script/README.md
 */

var NOTIFY_EMAIL = 'kris@badbellafilms.com';
var SHEET_NAME = 'Requests';
var ID_PREFIX = 'FT-';
var TIMEZONE = 'America/New_York';

var HEADERS = [
  'Request ID', 'Submitted (ET)', 'Name', 'Email', 'Company / Organization', 'Role / Title',
  'Heard About', 'Message', 'Landing Page', 'Submission Page', 'Referrer',
  'UTM Source', 'UTM Medium', 'UTM Campaign', 'UTM Content',
  'Status', 'Vimeo Review Link Name', 'Notes'
];

var HEARD_ABOUT_OPTIONS = [
  'Instagram', 'Facebook', 'Film festival', 'Friend / colleague',
  'Industry referral', 'Press / media', 'Other'
];

function doPost(e) {
  try {
    var data = JSON.parse((e && e.postData && e.postData.contents) || '{}');

    // Bots: honeypot filled, or form submitted faster than a human could.
    // Answer "ok" so they don't retry, but record nothing.
    if (data.website || Number(data.elapsed_ms) < 2500) {
      return json({ ok: true });
    }

    var r = {
      name: clean(data.name, 120),
      email: clean(data.email, 254).toLowerCase(),
      company: clean(data.company, 160),
      role: clean(data.role, 160),
      heard_about: HEARD_ABOUT_OPTIONS.indexOf(data.heard_about) > -1 ? data.heard_about : '',
      message: clean(data.message, 2000, true),
      landing_page: clean(data.landing_page, 500),
      submission_page: clean(data.submission_page, 500),
      referrer: clean(data.referrer, 500),
      utm_source: clean(data.utm_source, 200),
      utm_medium: clean(data.utm_medium, 200),
      utm_campaign: clean(data.utm_campaign, 200),
      utm_content: clean(data.utm_content, 200)
    };

    if (!r.name) return json({ ok: false, error: 'missing_name' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(r.email)) return json({ ok: false, error: 'invalid_email' });

    // Same email twice within 10 minutes (double click, resubmit): reuse the ID, no second email.
    var cache = CacheService.getScriptCache();
    var cacheKey = 'req_' + Utilities.base64EncodeWebSafe(r.email);
    var recent = cache.get(cacheKey);
    if (recent) return json({ ok: true, id: recent });

    var submitted = Utilities.formatDate(new Date(), TIMEZONE, "MMM d, yyyy, h:mm a") + ' ET';

    var lock = LockService.getScriptLock();
    lock.waitLock(15000);
    var id;
    try {
      var sheet = getSheet();
      id = ID_PREFIX + ('0000' + sheet.getLastRow()).slice(-4); // row 1 is the header
      sheet.appendRow([
        id, submitted, r.name, r.email, r.company, r.role, r.heard_about, r.message,
        r.landing_page, r.submission_page, r.referrer,
        r.utm_source, r.utm_medium, r.utm_campaign, r.utm_content,
        'Pending', '', ''
      ].map(sheetSafe));
      SpreadsheetApp.flush();
    } finally {
      lock.releaseLock();
    }

    cache.put(cacheKey, id, 600);
    sendNotification(id, submitted, r);

    return json({ ok: true, id: id });
  } catch (err) {
    console.error(err);
    return json({ ok: false, error: 'server_error' });
  }
}

// A quick check that the deployment is live: open the web app URL in a browser.
function doGet() {
  return json({ ok: true, service: 'family-tradition-screener-requests' });
}

function sendNotification(id, submitted, r) {
  var dash = function (v) { return v || '—'; };
  var lines = [
    'NEW FAMILY TRADITION SCREENER REQUEST',
    '',
    'Request ID: ' + id,
    'Name: ' + r.name,
    'Email: ' + r.email,
    'Company / Organization: ' + dash(r.company),
    'Role / Title: ' + dash(r.role),
    'How they heard about the film: ' + dash(r.heard_about),
    'Message: ' + dash(r.message),
    '',
    'ATTRIBUTION',
    'Submitted: ' + submitted,
    'Landing page: ' + dash(r.landing_page),
    'Submission page: ' + dash(r.submission_page),
    'Referrer: ' + (r.referrer || '— (direct, or not shared by the browser)')
  ];
  // Only list UTM tags that actually came in.
  [['UTM Source', r.utm_source], ['UTM Medium', r.utm_medium],
   ['UTM Campaign', r.utm_campaign], ['UTM Content', r.utm_content]].forEach(function (p) {
    if (p[1]) lines.push(p[0] + ': ' + p[1]);
  });
  lines.push('', 'Suggested Vimeo review link name: ' + id + ' ' + r.name);
  lines.push('Log: ' + SpreadsheetApp.getActiveSpreadsheet().getUrl());

  MailApp.sendEmail({
    to: NOTIFY_EMAIL,
    replyTo: r.email,
    name: 'Family Tradition Screener Requests',
    subject: 'FAMILY TRADITION - Screener Request - ' + id + ' - ' + r.name,
    body: lines.join('\n')
  });
}

function getSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
  }
  return sheet;
}

// Trim, strip control characters, cap length.
function clean(value, max, keepNewlines) {
  var s = String(value == null ? '' : value);
  s = keepNewlines ? s.replace(/[^\S\n]+/g, ' ').replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, '')
                   : s.replace(/\s+/g, ' ').replace(/[\u0000-\u001F\u007F]/g, '');
  return s.trim().slice(0, max);
}

// Stop anything that looks like a formula from executing in the Sheet.
function sheetSafe(value) {
  var s = String(value);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
