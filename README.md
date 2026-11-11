# Arunav & Shambhavi · Shubh Vivah invitation and RSVP

Static site for **arunav-rsvp-invitation.arunav.work**. It is the full wedding
invitation from the groom's side, built from `save-the-date/` and styled as a
traditional, modern North Indian card. It works on phones and desktops: above 760px
wide it switches to a full-width layout with a two-column hero and event grid.

## Structure

```
index.html   Markup and styles
app.js       Behaviour: envelope, countdown, RSVP form and uploads
apps-script/ Code.gs, the RSVP backend (Google Apps Script)
assets/      couple.jpg (hero arch), evara-logo.jpeg, og.jpg (share preview)
CNAME        Custom domain for GitHub Pages
```

## Sections

Envelope with seal, hero (toran, ॥ श्री गणेशाय नमः ॥, couple in an arch), invitation
wording, आत्मीय निवेदन (Maa's note in Hindi with an English toggle), venue, the four
events, countdown, RSVP, who to call, footer.

## After editing app.js

`index.html` loads `app.js?v=<hash>` so returning visitors don't keep an old cached
copy. After changing `app.js`, bump the tag:

```sh
v=$(shasum app.js | cut -c1-8); sed -i '' "s#app.js?v=[a-f0-9]*#app.js?v=$v#" index.html
```

## Guest experience notes

- The envelope plays once per browser session and is skipped for deep links
  (`.../?k=...#rsvp`), so reloads and "jump to RSVP" links go straight in.
- **Add to calendar** downloads one `.ics` with all four events (times in IST,
  stored as UTC). Edit `icsFile()` in `app.js` if timings change.
- After replying, guests see a summary of what they sent. If they open the form
  again on the same device, a note says they already replied.

## Things to edit

All of these are at the top of `app.js`:

- `CONTACTS`: names and roles for "Who to call". **Phone numbers are not in this
  repo.** They live in the Apps Script project's Script Properties under
  `CONTACTS`, as JSON, and the backend returns them only to visitors who opened
  the invite link (valid key). Example value:
  `[{"name":"Sunil Kumar Saxena","role":"Groom’s father","phone":"+91 98xxx xxxxx"}]`
- `TARGET`: the countdown target, currently the Carnival Lunch (27 Jan 2027, 1:00 PM IST).
- `RSVP_ENDPOINT`: the Apps Script web app that receives RSVPs and ID proofs (see below).
  It is public by design; the invite key is what protects it.

## RSVPs and ID proofs

Every field is required except the ID proofs. A guest who declines gives only name and phone. A guest
who attends also gives the guest count, arrival and departure (road or train, date,
time, and for train travel whether they need a pickup from or drop at the station, and if so which station and train), whether a driver is coming, and **an optional ID proof per guest** (Aadhaar, driving
licence or passport, as a photo or PDF up to 5 MB). Phone photos are shrunk to a
1800px JPEG in the browser before upload.

Replies go to a **Google Apps Script web app** (`apps-script/Code.gs`), bound to
the Google Sheet **"Wedding RSVPs · Arunav & Shambhavi"** in Arunav's Drive:

- **Invitation RSVPs** tab: one row per reply, with a link to that reply's ID folder.
- ID files go to the private Drive folder **RSVP > RSVP IDs**, one subfolder per
  reply, with files like `2 - Priya Sharma - Aadhaar.jpg`.

## Security

A public RSVP form must accept anonymous guests, so it cannot be hidden. Instead:

- **Nobody else can read anything.** The backend is write-only: responses are only
  `{ ok }` or a short error, never file links or sheet data. The Sheet and the ID
  folder are private to the owner. Share them only with whoever handles check-in.
- **Only invitees can write.** Every request must carry the invite key held in the
  script's Script Properties (`INVITE_KEY`). The key is in the invite link
  (`https://arunav-rsvp-invitation.arunav.work/?k=<key>`) and **never in this
  repo**. Without it the form shows "please use the link from your invitation" and
  the backend refuses the request. The page stores the key in the guest's browser,
  removes it from the address bar, and never sends it to other sites
  (`no-referrer`).
- **Strict server-side checks.** Every field is validated against fixed choices.
  Files are checked by their actual bytes (JPEG, PNG, WebP, HEIC or PDF), at most
  6 MB, one per guest and 10 per reply. A reply with missing IDs is refused.
- **Abuse limits.** At most 80 files and 40 replies per 10 minutes, and 600 files
  and 300 replies per day. There is a hidden bot-trap field, and cell values are
  escaped so they cannot run as spreadsheet formulas.
- **Locked-down page.** A Content Security Policy lets only `app.js` run and only
  lets it talk to `script.google.com`.

**If the invite link leaks:** open the Apps Script project, run `rotateInviteKey`,
copy the new link from the execution log, and send it to guests. The old link stops
working at once.

**Finding the invite link again:** run `setupInviteKey` in the Apps Script project.
It only logs the existing link.

## The bride's side shares this backend

`apps-script/Code.gs` also serves **save-the-date.arunav.work**, the invitation
from Sonia & Tarun Sharma. That page posts `kind: "rsvp-bride"` to the same `/exec`
URL, and the script keeps the two sides apart:

| | Groom's side | Bride's side |
|---|---|---|
| Sheet tab | Invitation RSVPs | Bride side RSVPs |
| Invite key | `INVITE_KEY` | `BRIDE_INVITE_KEY` (falls back to `INVITE_KEY` until set) |
| Contacts property | `CONTACTS` | `CONTACTS_BRIDE` |
| Rate-limit counter | `replies` | `replies-bride` |
| Drive folder | Wedding RSVP ID proofs | Bride side RSVP ID proofs (`FOLDER_ID_BRIDE`) |
| ID proofs | one per guest | optional; a reply with none is still saved |

Run **`setupBrideInviteKey`** once to create her key and tab and log her invite
link; `rotateBrideInviteKey` replaces it if the link leaks. The groom's side never
accepts the bride's key.

Redeploying for either side is the same operation, and both pages keep the same
`/exec` URL — so deploy a **new version of the existing deployment**, never a new
deployment.

## Changing the backend

This repo holds the source of truth, but it is **not** what is running: the
deployed copy has `DRIVE_FOLDER_ID` set to the RSVP IDs folder, and here it is
blank. `Code.gs` also serves the bride's site, so a careless paste takes her
RSVPs down as well as yours. Every change goes out like this.

1. **Open the editor.** The RSVP Sheet → **Extensions → Apps Script**. Both
   sides live in one file: hers is everything named `BRIDE_*`, plus
   `saveBrideRsvp_`, `brideSheet_` and `setupBrideInviteKey`.
2. **Check the editor against this repo first.** Click in the code, select all,
   copy, and diff it against `apps-script/Code.gs`. If they differ, someone
   edited in the browser without committing: work out which is newer before you
   overwrite anything.
3. **Make the change here**, not in the browser, and keep `DRIVE_FOLDER_ID` and
   `BRIDE_DRIVE_FOLDER_ID` blank in the repo.
4. **Keep every validated value ASCII.** Anything the backend checks against a
   fixed list (dates, modes, yes/no answers, ID types) must be plain ASCII on
   both sides. A middle dot does not survive the POST into Apps Script and every
   reply is rejected.
5. **Paste it in.** In the editor: select all, paste, then restore the
   `DRIVE_FOLDER_ID` line the deployed copy had. Save (⌘S / Ctrl+S) and wait for
   "Saved to Drive". A syntax error blocks the save, which is the first check.
6. **Verify what actually landed.** Select all, copy, and diff against the file
   you meant to deploy. The editor is easy to paste into by accident, and a
   clipboard that changed under you is hard to spot by eye.
7. **Deploy.** **Deploy → Manage deployments → pencil → Version: New version →
   Deploy.** The deployment id, and so the `/exec` URL in `app.js` and on the
   bride's site, stays the same.
8. **Send one real reply** from the site and confirm the row lands, then delete
   that row. Apps Script errors are invisible to the guest beyond a short
   message, so a live reply is the only real test.
9. **Commit and push**, so the next person does not start from a version that is
   behind what is running.

To undo a bad paste before saving: ⌘Z / Ctrl+Z in the editor restores the
previous content. If a bad version is already deployed, redeploy from the repo
file rather than editing the live one by hand.

### If someone else is deploying

Script access is granted by sharing the **Sheet** as Editor: the script is bound
to it and has no sharing of its own. That also hands over every RSVP on both
sides, so decide on the data access first. Two rules for whoever has it:

- **Deploy a new version of the existing deployment, never a new deployment.** A
  new one gets a new URL and silently breaks both sites.
- **Don't run `setupInviteKey`, `setupBrideInviteKey` or the rotate functions
  from the editor.** Those run as them, and the Drive folders aren't shared with
  them, so they'll fail or create stray folders in their own Drive. Keep those
  for the owner.

One person in the editor at a time, working from the repo file: the Apps Script
editor has no merge, so whoever saves last wins.

A copy of each reply, without the files, is saved in the guest's browser under
`localStorage` `sa-wedding-invite-rsvps`.

## Publishing

Repo `arunavsaxena/arunav-rsvp-invitation`, GitHub Pages from `main` (root), custom
domain set. To go live:

1. At BigRock DNS, add `CNAME  arunav-rsvp-invitation → arunavsaxena.github.io`.
2. In the repo's Pages settings, enable **Enforce HTTPS** once the certificate is issued.

The folder is listed in the parent `arunav_work/.gitignore`, so it is never committed
to the public `arunavsaxena.github.io` repo.

## Before sharing with guests

- [ ] Add phone numbers in `CONTACTS`
- [ ] Share the invite link that has `?k=`, not the bare domain
- [ ] Confirm the Engagement start time: the itinerary says "6:00 / 7:00 PM"; the page shows 6:00 PM
