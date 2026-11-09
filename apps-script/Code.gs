/**
 * RSVP backend for arunav-rsvp-invitation.arunav.work
 *
 * Bind this script to the Google Sheet that should hold RSVPs
 * (Extensions > Apps Script), then deploy it as a web app:
 *   Execute as: Me    Who has access: Anyone
 * Paste the /exec URL into RSVP_ENDPOINT in index.html.
 *
 * - Each RSVP becomes one row in the "Invitation RSVPs" tab.
 * - Each ID proof is saved to a private Drive folder,
 *   "Wedding RSVP ID proofs", with one subfolder per RSVP.
 *   Only the owner of this script can open them.
 */

var SHEET_NAME = 'Invitation RSVPs';
var FOLDER_NAME = 'Wedding RSVP ID proofs';
var MAX_BYTES = 6 * 1024 * 1024;
var MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf'];
var ID_TYPES = ['Aadhaar', 'Driving licence', 'Passport'];
var HEADERS = [
  'Submitted at', 'Attending', 'Name', 'Phone', 'Guests',
  'Arrival by', 'Arrival date', 'Arrival time',
  'Departure by', 'Departure date', 'Departure time',
  'Driver', 'Guests & ID proofs', 'ID folder', 'Submission id'
];

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    var body = JSON.parse(e.postData.contents);
    if (body.kind === 'file') return json_(saveFile_(body));
    if (body.kind === 'rsvp') return json_(saveRsvp_(body));
    return json_({ ok: false, error: 'Unknown request' });
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message || err) });
  } finally {
    try { lock.releaseLock(); } catch (e2) {}
  }
}

function doGet() {
  return json_({ ok: true, service: 'rsvp' });
}

function saveFile_(b) {
  checkId_(b.submissionId);
  if (ID_TYPES.indexOf(b.idType) === -1) throw new Error('ID must be Aadhaar, driving licence or passport');
  if (MIME_TYPES.indexOf(b.mimeType) === -1) throw new Error('Only images or PDF files are accepted');
  var bytes = Utilities.base64Decode(String(b.data || ''));
  if (!bytes.length || bytes.length > MAX_BYTES) throw new Error('File is empty or too large');

  var folder = submissionFolder_(b.submissionId, b.primaryName);
  var ext = b.mimeType === 'application/pdf' ? 'pdf' : (b.mimeType.split('/')[1] || 'jpg').replace('jpeg', 'jpg');
  var name = (Number(b.index) + 1) + ' - ' + clean_(b.guestName, 60) + ' - ' + b.idType + '.' + ext;
  var file = folder.createFile(Utilities.newBlob(bytes, b.mimeType, name));
  return { ok: true, url: file.getUrl(), folderUrl: folder.getUrl() };
}

function saveRsvp_(b) {
  checkId_(b.submissionId);
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
  }
  var guests = (b.ids || []).map(function (g, i) {
    return (i + 1) + '. ' + clean_(g.name, 60) + ' (' + clean_(g.idType, 20) + ')';
  }).join('\n');
  var folderUrl = '';
  if (b.ids && b.ids.length) {
    var it = rootFolder_().getFoldersByName(folderName_(b.submissionId, b.name));
    if (it.hasNext()) folderUrl = it.next().getUrl();
  }
  sheet.appendRow([
    new Date(), b.attending, b.name, b.phone, b.guests,
    b.arriveBy, b.arriveDate, b.arriveTime,
    b.departBy, b.departDate, b.departTime,
    b.driver, guests, folderUrl, b.submissionId
  ].map(cell_));
  return { ok: true };
}

function rootFolder_() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('FOLDER_ID');
  if (id) {
    try { return DriveApp.getFolderById(id); } catch (e) {}
  }
  var folder = DriveApp.createFolder(FOLDER_NAME);
  props.setProperty('FOLDER_ID', folder.getId());
  return folder;
}

function folderName_(submissionId, primaryName) {
  return clean_(primaryName, 60) + ' · ' + String(submissionId).slice(0, 8);
}

function submissionFolder_(submissionId, primaryName) {
  var root = rootFolder_();
  var name = folderName_(submissionId, primaryName);
  var it = root.getFoldersByName(name);
  return it.hasNext() ? it.next() : root.createFolder(name);
}

function checkId_(id) {
  if (!/^[a-z0-9-]{12,40}$/i.test(String(id || ''))) throw new Error('Bad submission id');
}

function clean_(v, max) {
  return String(v == null ? '' : v).replace(/[\\/:*?"<>|\r\n]+/g, ' ').trim().slice(0, max || 200);
}

// Stop values like "+91..." or "=..." from being read as formulas.
function cell_(v) {
  var s = v == null ? '' : String(v).slice(0, 2000);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
