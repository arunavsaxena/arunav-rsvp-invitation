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
- `GOOGLE_FORM` / `RSVP_ENDPOINT`: where RSVPs go (see below).

## RSVPs

The RSVP posts to the **same Google Form as save-the-date**, so replies from both
pages land in one Sheet. Field mapping is in `save-the-date/README.md`. Replies from
this page look like this:

- **Functions attending** is `Both days`, or `Not attending` for a decline.
- **Special requests** holds the travel details, for example
  `Arrival: by train, Wed, 27 Jan, 11:00 am | Departure: by road, Fri, 29 Jan, 10:00 am | Drivers: 1`.
  Arrival and departure each have a mode (road or train), a date and a time;
  drivers is an optional count. The Form has no separate travel questions.
- **Number of guests** is `0` for a decline.
- **Message for us** is left empty.

Each reply is also saved in the guest's browser under `localStorage`
`sa-wedding-invite-rsvps`. The Google Forms response is opaque (`no-cors`), so
**send one test reply and confirm it reaches the Sheet** before sharing the link.

## Publishing

Repo `arunavsaxena/arunav-rsvp-invitation`, GitHub Pages from `main` (root), custom
domain set. To go live:

1. At BigRock DNS, add `CNAME  arunav-rsvp-invitation → arunavsaxena.github.io`.
2. In the repo's Pages settings, enable **Enforce HTTPS** once the certificate is issued.

The folder is listed in the parent `arunav_work/.gitignore`, so it is never committed
to the public `arunavsaxena.github.io` repo.

## Before sharing with guests

- [ ] Add phone numbers in `CONTACTS`
- [ ] Send a test RSVP, check it reaches the Sheet, then delete the test row
- [ ] Confirm the Engagement start time: the itinerary says "6:00 / 7:00 PM"; the page shows 6:00 PM
