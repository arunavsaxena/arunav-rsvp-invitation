# Arunav & Shambhavi · Shubh Vivah invitation and RSVP

Static site for **arunav-rsvp-invitation.arunav.work**. It is the full wedding
invitation from the groom's side, built from `save-the-date/` and styled as a
traditional, modern North Indian card. It works on phones and desktops: above 760px
wide it switches to a full-width layout with a two-column hero and event grid.

## Structure

```
index.html   Whole site: markup, styles and behaviour in one file
assets/      couple.jpg (hero arch), evara-logo.jpeg, og.jpg (share preview)
CNAME        Custom domain for GitHub Pages
```

## Sections

Envelope with seal, hero (toran, ॥ श्री गणेशाय नमः ॥, couple in an arch), invitation
wording, आत्मीय निवेदन (Maa's note in Hindi with an English toggle), venue, the four
events, countdown, RSVP, who to call, footer.

## Things to edit

All of these are at the top of the `<script>` block in `index.html`:

- `CONTACTS`: groom's side only. Phone numbers are **empty**; a person with no
  number is listed by name only, with no Call or WhatsApp buttons. Fill them in as
  `"+91 98xxx xxxxx"`.
- `TARGET`: the countdown target, currently the Carnival Lunch (27 Jan 2027, 1:00 PM IST).
- `RSVP_ENDPOINT`: the Apps Script web app that receives RSVPs and ID proofs (see below).

## RSVPs and ID proofs

Every field is required. A guest who declines gives only name and phone. A guest
who attends also gives the guest count, arrival and departure (road or train, date,
time), whether a driver is coming, and **one ID proof per guest** (Aadhaar, driving
licence or passport, as a photo or PDF up to 5 MB). Phone photos are shrunk to a
1800px JPEG in the browser before upload.

Google Forms cannot take file uploads from a web page, so RSVPs go to a small
**Google Apps Script web app** (`apps-script/Code.gs`) that you deploy once:

1. Open the Google Sheet that should hold RSVPs. The save-the-date responses Sheet
   works; replies go to a new **Invitation RSVPs** tab.
2. **Extensions → Apps Script**. Replace the contents of `Code.gs` with
   `apps-script/Code.gs` from this repo and save.
3. **Deploy → New deployment → Web app**. Set *Execute as* to **Me** and
   *Who has access* to **Anyone**. Deploy, approve the Drive and Sheets permissions,
   and copy the **Web app URL** (it ends in `/exec`).
4. Paste that URL into `RSVP_ENDPOINT` at the top of the `<script>` block in
   `index.html`, then commit and push.
5. Send one test RSVP with a dummy ID, check the row and the file, then delete both.

What you get:

- **Invitation RSVPs** tab: one row per reply with every answer, the list of
  guests and their ID types, and a link to that reply's ID folder.
- **Wedding RSVP ID proofs** folder in your Drive: one subfolder per reply, named
  after the guest, with files like `2 - Priya Sharma - Aadhaar.jpg`. The folder is
  private to you; share it only with whoever handles hotel check-in.

If you change `Code.gs` later, use **Deploy → Manage deployments → Edit → New
version** so the URL stays the same.

Until `RSVP_ENDPOINT` is set, the form validates but will not send. It tells the
guest to call instead. The page itself cannot check that an upload really is an
Aadhaar, licence or passport; it only limits the type and the file format.

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
- [ ] Deploy `apps-script/Code.gs` and set `RSVP_ENDPOINT`
- [ ] Send a test RSVP with a dummy ID, check the row and file, then delete both
- [ ] Confirm the Engagement start time: the itinerary says "6:00 / 7:00 PM"; the page shows 6:00 PM
