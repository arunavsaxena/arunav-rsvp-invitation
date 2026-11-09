/**
 * RSVP backend for arunav-rsvp-invitation.arunav.work
 *
 * Bound to the RSVP Google Sheet and deployed as a web app
 * (Execute as: Me, Who has access: Anyone).
 *
 * Security model
 * - Write-only for guest data: no request can read RSVPs or files back.
 *   Responses carry only { ok }, a short error, or (for 'contacts') the
 *   family's phone numbers, which are kept in Script Properties as CONTACTS
 *   so they never appear in the public page or repo.
 * - Invitation key: every request must carry the key stored in Script
 *   Properties as INVITE_KEY (made by setupInviteKey). It is in the invite
 *   link (?k=...), never in the public repo. Without it nothing is written.
 * - The Sheet and the ID proofs Drive folder (DRIVE_FOLDER_ID, or a new
 *   "Wedding RSVP ID proofs" folder) belong to the owner and are not shared.
 * - Files are checked by their actual bytes (JPEG, PNG, WebP, HEIC or PDF),
 *   capped at 6 MB, at most 10 per reply, and only one per guest slot.
 * - Rate limits: per 10 minutes and per day, for files and replies.
 * - A hidden "website" field traps form-filling bots.
 * - Cell values are escaped so they cannot run as spreadsheet formulas.
 */

var SHEET_NAME = 'Invitation RSVPs';
var FOLDER_NAME = 'Wedding RSVP ID proofs';
// Drive folder that receives ID proofs. Set this in the deployed copy only;
// it stays blank in the public repo. Leave blank to create a new private folder.
var DRIVE_FOLDER_ID = '';
var MAX_BYTES = 6 * 1024 * 1024;
var MAX_GUESTS = 10;
var LIMITS = { files10m: 80, replies10m: 40, filesDay: 600, repliesDay: 300 };
var MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf'];
var ID_TYPES = ['Aadhaar', 'Driving licence', 'Passport'];
var MODES = ['Road', 'Train'];
var ARRIVE_DATES = ['Wed, 27 Jan', 'Thu, 28 Jan'];
var DEPART_DATES = ['Thu, 28 Jan', 'Fri, 29 Jan'];
var HEADERS = [
  'Submitted at', 'Attending', 'Name', 'Phone', 'Guests',
  'Arrival by', 'Arrival date', 'Arrival time',
  'Departure by', 'Departure date', 'Departure time',
  'Driver', 'Guests & ID proofs', 'ID folder', 'Submission id', 'Station pickup', 'Station drop'
];

/** A message that is safe to show the guest. Anything else becomes generic. */
function Reject(message) { this.message = message; }

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    if (!lock.tryLock(25000)) return json_({ ok: false, error: 'We are busy right now. Please try again.' });
    var raw = (e && e.postData && e.postData.contents) || '';
    if (raw.length > 9 * 1024 * 1024) throw new Reject('That upload is too large.');
    var body = JSON.parse(raw || '{}');
    checkKey_(body.key);
    if (body.website) return json_({ ok: true });   // bot trap: pretend success, store nothing
    if (body.kind === 'file') { saveFile_(body); return json_({ ok: true }); }
    if (body.kind === 'rsvp') { saveRsvp_(body); return json_({ ok: true }); }
    if (body.kind === 'contacts') return json_({ ok: true, contacts: contacts_() });
    throw new Reject('Unknown request.');
  } catch (err) {
    if (!(err instanceof Reject)) console.error(err);
    return json_({ ok: false, error: err instanceof Reject ? err.message : 'Something went wrong.' });
  } finally {
    lock.releaseLock();
  }
}

function doGet() {
  return json_({ ok: true });
}

/**
 * Run once from the editor (select it, then Run). It creates the invite key,
 * the private Drive folder and the RSVP tab, and logs the invite link.
 * Running it again only logs the existing link.
 */
function setupInviteKey() {
  var props = PropertiesService.getScriptProperties();
  var key = props.getProperty('INVITE_KEY');
  if (!key) {
    key = (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, '').slice(0, 40);
    props.setProperty('INVITE_KEY', key);
  }
  rootFolder_();
  rsvpSheet_();
  console.log('Invite link: https://arunav-rsvp-invitation.arunav.work/?k=' + key);
}

/** If the invite link leaks, run this, then send guests the new link. */
function rotateInviteKey() {
  PropertiesService.getScriptProperties().deleteProperty('INVITE_KEY');
  setupInviteKey();
}

// ---------------------------------------------------------------------------

function checkKey_(key) {
  var want = PropertiesService.getScriptProperties().getProperty('INVITE_KEY');
  if (!want || typeof key !== 'string' || key !== want) {
    throw new Reject('This RSVP link is not valid. Please use the link from your invitation.');
  }
}

function saveFile_(b) {
  checkId_(b.submissionId);
  var index = Number(b.index);
  if (!(index >= 0 && index < MAX_GUESTS && Math.floor(index) === index)) throw new Reject('Bad guest number.');
  var guestName = text_(b.guestName, 80, 'guest name');
  var primary = text_(b.primaryName, 80, 'name');
  if (ID_TYPES.indexOf(b.idType) === -1) throw new Reject('ID must be Aadhaar, driving licence or passport.');
  if (MIME_TYPES.indexOf(b.mimeType) === -1) throw new Reject('Only photos or PDF files are accepted.');

  var bytes = Utilities.base64Decode(String(b.data || ''));
  if (!bytes.length || bytes.length > MAX_BYTES) throw new Reject('File is empty or larger than 5 MB.');
  if (!looksLike_(bytes, b.mimeType)) throw new Reject('That file is not a valid photo or PDF.');

  bump_('files', LIMITS.files10m, LIMITS.filesDay);

  var folder = submissionFolder_(b.submissionId, primary, true);
  var prefix = (index + 1) + ' - ';
  var files = folder.getFiles(), count = 0;
  while (files.hasNext()) {
    var f = files.next();
    count++;
    if (f.getName().indexOf(prefix) === 0) throw new Reject('An ID for this guest was already uploaded.');
  }
  if (count >= MAX_GUESTS) throw new Reject('Too many files for one reply.');

  var ext = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/heic': 'heic', 'image/heif': 'heif', 'application/pdf': 'pdf' }[b.mimeType];
  folder.createFile(Utilities.newBlob(bytes, b.mimeType, prefix + guestName + ' - ' + b.idType + '.' + ext));
}

function saveRsvp_(b) {
  checkId_(b.submissionId);
  var cache = CacheService.getScriptCache();
  if (cache.get('done:' + b.submissionId)) return;   // repeat of a reply already saved

  if (b.attending !== 'Yes' && b.attending !== 'No') throw new Reject('Please say whether you can come.');
  var name = text_(b.name, 80, 'name');
  var phone = String(b.phone || '').trim();
  var digits = phone.replace(/\D/g, '');
  if (!/^[+\d\s()\-]{10,20}$/.test(phone) || digits.length < 10 || digits.length > 15) throw new Reject('Please add a valid phone number.');

  var row = { attending: b.attending, name: name, phone: phone, guests: '', arriveBy: '', arriveDate: '', arriveTime: '',
              departBy: '', departDate: '', departTime: '', driver: '', ids: '', folder: '', pickup: '', drop: '' };

  if (b.attending === 'Yes') {
    var guests = Number(b.guests);
    if (!(guests >= 1 && guests <= MAX_GUESTS && Math.floor(guests) === guests)) throw new Reject('Please choose the number of guests.');
    oneOf_(b.arriveBy, MODES, 'arrival mode');
    oneOf_(b.arriveDate, ARRIVE_DATES, 'arrival date');
    time_(b.arriveTime, 'arrival time');
    // Station pickup is asked only for train arrivals; pages opened before
    // the question existed do not send it, so a blank answer is kept blank.
    var pickup = '';
    if (b.arriveBy === 'Train' && b.pickup) { oneOf_(b.pickup, ['Yes', 'No'], 'pickup answer'); pickup = b.pickup; }
    oneOf_(b.departBy, MODES, 'departure mode');
    oneOf_(b.departDate, DEPART_DATES, 'departure date');
    time_(b.departTime, 'departure time');
    var drop = '';
    if (b.departBy === 'Train' && b.drop) { oneOf_(b.drop, ['Yes', 'No'], 'drop answer'); drop = b.drop; }
    oneOf_(b.driver, ['Yes', 'No'], 'driver answer');
    if (!Array.isArray(b.ids) || b.ids.length !== guests) throw new Reject('Please add the name of every guest.');
    // ID proofs are optional. A guest marked file:false sent none; older pages
    // omit the flag and always sent one.
    var expected = 0;
    var list = b.ids.map(function (g, i) {
      if (!g || typeof g !== 'object') throw new Reject('Please add the name of every guest.');
      var hasId = g.file !== false;
      if (hasId) { oneOf_(g.idType, ID_TYPES, 'ID type'); expected++; }
      return (i + 1) + '. ' + text_(g.name, 80, 'guest name') + ' (' + (hasId ? g.idType : 'no ID yet') + ')';
    }).join('\n');

    var folder = expected ? submissionFolder_(b.submissionId, name, false) : null;
    var count = 0;
    if (folder) { var it = folder.getFiles(); while (it.hasNext()) { it.next(); count++; } }
    if (count !== expected) throw new Reject('Some ID proofs did not upload. Please try again.');

    row.guests = guests; row.arriveBy = b.arriveBy; row.arriveDate = b.arriveDate; row.arriveTime = b.arriveTime;
    row.departBy = b.departBy; row.departDate = b.departDate; row.departTime = b.departTime;
    row.driver = b.driver; row.ids = list; row.folder = folder ? folder.getUrl() : ''; row.pickup = pickup; row.drop = drop;
  }

  bump_('replies', LIMITS.replies10m, LIMITS.repliesDay);

  var values = [
    row.attending, row.name, row.phone, row.guests,
    row.arriveBy, row.arriveDate, row.arriveTime,
    row.departBy, row.departDate, row.departTime,
    row.driver, row.ids, row.folder, b.submissionId, row.pickup, row.drop
  ].map(cell_);
  // Write everything after the timestamp as plain text, so Sheets does not
  // turn "Wed, 27 Jan" into a date in the wrong year or "11:00" into a time.
  var sheet = rsvpSheet_();
  var r = sheet.getLastRow() + 1;
  sheet.getRange(r, 1).setValue(new Date());
  sheet.getRange(r, 2, 1, values.length).setNumberFormat('@').setValues([values]);
  cache.put('done:' + b.submissionId, '1', 21600);
}

// ---------------------------------------------------------------------------

/**
 * Family contact numbers for the "Who to call" section, served only with a
 * valid invite key. Stored in Script Properties under CONTACTS as JSON:
 *   [{"name":"Sunil Kumar Saxena","role":"Groom's father","phone":"+91 98xxx xxxxx"}, ...]
 */
function contacts_() {
  var raw = PropertiesService.getScriptProperties().getProperty('CONTACTS');
  if (!raw) return [];
  try {
    var list = JSON.parse(raw);
    if (!Array.isArray(list)) return [];
    return list.slice(0, 12).map(function (c) {
      return {
        name: clean_(c && c.name, 60),
        role: clean_(c && c.role, 40),
        phone: String((c && c.phone) || '').replace(/[^\d+ ]/g, '').trim().slice(0, 20)
      };
    }).filter(function (c) { return c.name; });
  } catch (e) {
    return [];
  }
}

function rsvpSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
  } else if (!sheet.getRange(1, HEADERS.length).getValue()) {
    // Columns added later get their header on the existing tab.
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight('bold');
  }
  return sheet;
}

function rootFolder_() {
  if (DRIVE_FOLDER_ID) return DriveApp.getFolderById(DRIVE_FOLDER_ID);
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('FOLDER_ID');
  if (id) {
    try { return DriveApp.getFolderById(id); } catch (e) {}
  }
  var folder = DriveApp.createFolder(FOLDER_NAME);
  props.setProperty('FOLDER_ID', folder.getId());
  return folder;
}

function submissionFolder_(submissionId, primaryName, create) {
  var root = rootFolder_();
  var name = clean_(primaryName, 60) + ' · ' + String(submissionId).slice(0, 8);
  var it = root.getFoldersByName(name);
  if (it.hasNext()) return it.next();
  return create ? root.createFolder(name) : null;
}

/** Counts requests in 10-minute and daily windows; rejects past the limits. */
function bump_(name, per10m, perDay) {
  var cache = CacheService.getScriptCache();
  var slot = name + ':10m:' + Math.floor(Date.now() / 600000);
  var n = Number(cache.get(slot) || 0);
  if (n >= per10m) throw new Reject('Too many replies right now. Please try again in a few minutes.');
  cache.put(slot, String(n + 1), 900);

  var props = PropertiesService.getScriptProperties();
  var day = name + ':day:' + Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyy-MM-dd');
  var d = Number(props.getProperty(day) || 0);
  if (d >= perDay) throw new Reject('We have reached today\'s limit. Please call us instead.');
  props.setProperty(day, String(d + 1));
}

/** Checks the file's first bytes match the type it claims to be. */
function looksLike_(bytes, mime) {
  function b(i) { return bytes.length > i ? bytes[i] & 255 : -1; }
  function ascii(i, s) { for (var k = 0; k < s.length; k++) if (b(i + k) !== s.charCodeAt(k)) return false; return true; }
  switch (mime) {
    case 'image/jpeg': return b(0) === 0xFF && b(1) === 0xD8 && b(2) === 0xFF;
    case 'image/png': return b(0) === 0x89 && ascii(1, 'PNG');
    case 'image/webp': return ascii(0, 'RIFF') && ascii(8, 'WEBP');
    case 'image/heic':
    case 'image/heif': return ascii(4, 'ftyp');
    case 'application/pdf': return ascii(0, '%PDF');
  }
  return false;
}

function checkId_(id) {
  if (typeof id !== 'string' || !/^[a-z0-9-]{12,40}$/i.test(id)) throw new Reject('Bad request.');
}

function oneOf_(v, list, what) {
  if (list.indexOf(v) === -1) throw new Reject('Please choose the ' + what + '.');
}

function time_(v, what) {
  if (typeof v !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(v)) throw new Reject('Please add the ' + what + '.');
}

function text_(v, max, what) {
  var s = clean_(v, max);
  if (!s) throw new Reject('Please add the ' + what + '.');
  return s;
}

function clean_(v, max) {
  return String(v == null ? '' : v).replace(/[\u0000-\u001f\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max || 200);
}

// Stop values like "+91..." or "=..." from being read as formulas.
function cell_(v) {
  var s = v == null ? '' : String(v).slice(0, 2000);
  return /^[=+\-@\t\r]/.test(s) ? "'" + s : s;
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
