# apps/web — Manual QA Checklist

Smoke checklist for the golden paths shipped under epic [#39](https://github.com/yigitbozyaka/freightmatch/issues/39). Run end-to-end against a clean DB before promoting `master` to a release branch.

## Setup

1. `pnpm dev` from the monorepo root (boots web + user-service + load-service + bid-service + ai-service)
2. Register two fresh accounts: one `Shipper`, one `Carrier`
3. Open the shipper in one browser, the carrier in an incognito window

## Golden paths

### 1. Shipper onboarding

- [ ] `/register` rejects mismatched passwords with an inline error
- [ ] After register, lands on `/shipper/dashboard` (no role-routing flash)
- [ ] Empty dashboard shows themed "no loads yet" state with CTA to `/shipper/loads/new`
- [ ] `/shipper/profile`: setting company name, contact name, and phone enables Save; refresh confirms persistence
- [ ] `/settings`: change password flow validates current password and signs out on success

### 2. Shipper posts a load

- [ ] `/shipper/loads/new` step 1: origin/destination Nominatim search returns results, pins update on selection
- [ ] Step 2: weight, cargo type, deadline validate (deadline must be future, weight > 0)
- [ ] Step 3: review screen shows all fields with mono numerics and amber edge
- [ ] Step 4: submit → toast confirms → redirect to `/shipper/loads/[id]`
- [ ] Load detail timeline shows `Posted` step active; Bid Inbox shows "No bids yet" empty state
- [ ] `/shipper/loads` index lists the new load with status chip = `Posted`

### 3. Carrier discovers + bids

- [ ] Sign in as carrier; lands on `/carrier/dashboard`
- [ ] Profile-incomplete banner appears with link to `/carrier/profile`
- [ ] Complete carrier profile (truck type, capacity kg) → banner clears
- [ ] `/marketplace` Cards view shows the shipper's load
- [ ] Filter by cargo type, min/max weight, max deadline — counts update; empty state shows on no match
- [ ] Switch to Map view → pin renders at origin; clicking pin opens drawer with summary
- [ ] Open `/marketplace/[id]` → BidForm visible; price/eta/notes validate; submit succeeds
- [ ] After submit, `/bids` shows the new bid under "Pending"; load detail's "Your bid" panel shows read-only summary

### 4. Shipper accepts a bid

- [ ] Shipper reloads `/shipper/loads/[id]`; Bid Inbox lists carrier's bid
- [ ] AI Recommendations panel ranks the bid (or shows "No recommendations" empty)
- [ ] Click "Accept" → confirmation; load timeline advances to `Booked`; competing bids auto-rejected (if any)
- [ ] Carrier's `/bids` now shows the bid under "Accepted"

### 5. Status transitions

- [ ] Shipper marks `In Transit` from load detail; timeline + status chips update
- [ ] Shipper marks `Delivered`; load chip turns green; `/shipper/loads` filter "Delivered" includes it
- [ ] Reverse direction not possible (UI hides illegal transitions)

### 6. Ask Ops chat

- [ ] `/chat` greets with empty state ("link standby")
- [ ] Suggested prompts disabled while sending; after response, chat scrolls to bottom
- [ ] Long markdown response renders with mono code blocks and tables

## Accessibility

- [ ] Tab from URL bar reveals "Skip to main content" — pressing Enter focuses the page main
- [ ] All form fields announced with label + error via screen reader (VoiceOver / NVDA)
- [ ] Focus rings visible on amber primary buttons (dark inner ring, amber outer)
- [ ] All routes pass Axe DevTools with **0 serious/critical** violations
- [ ] Keyboard-only: open drawers (bid form, profile photo crop, AI recs) with Enter; Escape closes
- [ ] `prefers-reduced-motion: reduce` neutralizes hero corridor pulses, drawer slides, skeleton pulses

## Performance (Lighthouse — mobile, throttled)

- [ ] `/` landing — Performance ≥ 95
- [ ] `/shipper/dashboard` — Performance ≥ 90
- [ ] `/carrier/dashboard` — Performance ≥ 90
- [ ] `/marketplace` — Performance ≥ 90
- [ ] CLS < 0.1 on every route above

## Error + edge states

- [ ] `/no-such-route` renders themed 404 with "Return to base"
- [ ] Throwing an error in any RSC renders themed 500 (`error.tsx`) with Retry + Return to base
- [ ] Backend down (kill user-service): protected pages show themed error, sign-in shows "Unable to sign in right now"
- [ ] Network offline: queries surface "Couldn't load" empty states, not blank pages

## Notes

- The `(carrier)`, `(shipper)`, `(shared)`, `(auth)` route groups all share the same Navbar and skip link — verify visually on the auth screens that the skip link is reachable but not visible by default.
- Status pill flicker is a one-off animation on mount; should not loop.
