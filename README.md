# Arunav & Shambhavi — Shubh Vivah invitation + RSVP

Static site for **arunav-rsvp-invitation.arunav.work**. It is the full wedding
invitation (groom's side), copied from `save-the-date/` and restyled as a traditional,
modern North Indian card.

## Structure

```
index.html   Whole site: markup, styles and behaviour in one file
assets/      couple.jpg (hero arch), evara-logo.jpeg, og.jpg (share preview)
CNAME        Custom domain for GitHub Pages
```

## Sections

Envelope with seal → hero (toran, ॥ श्री गणेशाय नमः ॥, couple in a jharokha arch) →
bride & groom with parents → **आत्मीय निवेदन** (Maa's note, Hindi with an English
toggle) → four event cards with themed scenes and a running order → venue →
countdown → RSVP → who to call → footer.

## Things to edit

All of these are at the top of the `<script>` block in `index.html`:

- `CONTACTS`: phone numbers are **empty**. A person with no number is listed by
  name only, with no Call or WhatsApp buttons. Fill them in as `"+91 98xxx xxxxx"`.
- `TARGET`: the countdown target, currently the Carnival Lunch (27 Jan 2027, 1:00 PM IST).
- `GOOGLE_FORM` / `RSVP_ENDPOINT`: where RSVPs go (see below).

## RSVPs

The RSVP posts to the **same Google Form as save-the-date**, so replies from both
pages land in one Sheet. Field mapping is in `save-the-date/README.md`. To tell the
two pages' replies apart:

- **Functions attending** uses the new names (Carnival Lunch, Engagement, Shaadi,
  Reception) or `Not attending` for a decline.
- **Special requests** starts with `Arrival: <date>, by <mode>, <note> |` when the
  guest filled in arrival details. The Form has no separate arrival question.
- A decline sends `0` guests.

Each reply is also saved in the guest's browser under `localStorage`
`sa-wedding-invite-rsvps`. The Google Forms response is opaque (`no-cors`),
so **send one test reply and confirm it reaches the Sheet** before you share the link.

## Publishing (same pattern as save-the-date)

1. Create a GitHub repo, for example `arunavsaxena/arunav-rsvp-invitation`, push this
   folder to it, and turn on Pages (branch `main`, root).
2. At BigRock DNS, add `CNAME  arunav-rsvp-invitation → arunavsaxena.github.io`.
3. In the repo's Pages settings, enable **Enforce HTTPS** once the certificate is issued.

The folder is listed in the parent `arunav_work/.gitignore`, so it is never committed
to the public `arunavsaxena.github.io` repo.

## Before sharing with guests

- [ ] Add phone numbers in `CONTACTS`
- [ ] Send a test RSVP, check it reaches the Sheet, then delete the test row
- [ ] Confirm the Engagement start time: the itinerary says "6:00 / 7:00 PM"; the page shows 6:00 PM
