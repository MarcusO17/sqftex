---
name: booking-payment-flow
description: Use whenever working on booking creation, payment capture, escrow release, host payouts, or commission calculation. This is the most business-critical and easiest-to-get-wrong part of the platform — consult this before modifying any code in the `bookings` or `payments` apps.
---

# Booking → Payment → Escrow → Payout flow

## The lifecycle (must stay in this order)

1. **Booking created** — renter selects dates, listing availability is
   provisionally held (not confirmed) to prevent double-booking during
   payment.
2. **Payment captured** — via Curlec (FPX). Funds are captured immediately
   but marked `held`, not `released`, in the `payments` app. Commission
   amount is calculated and stored on the booking record *at this point* —
   never recalculate commission later from a live rate, since rates may
   change and historical bookings must stay consistent.
3. **Move-in confirmation** — renter confirms move-in (in-app action), or an
   auto-confirm window elapses (default: 48h after booking start date, unless
   the PRD/config specifies otherwise). This is what triggers escrow release
   — payment capture alone does NOT release funds to the host.
4. **Payout** — released funds go to the host on the next scheduled payout
   run, minus the commission already calculated in step 2.
5. **Guarantee claims** — if a renter reports damage/loss, it must reference
   drop-off verification photos. Claims are capped per the amount defined in
   `docs/PRD.md` — never build a flow that pays out above the cap or implies
   uncapped coverage.

## Things that will break this if done carelessly
- Don't release escrow on payment capture — that removes the fraud
  protection the whole model depends on.
- Don't store commission as "current rate applied at payout time" — always
  freeze it at booking time.
- Don't allow a booking to be created against a listing whose host hasn't
  completed ID verification, even if the API call would otherwise succeed —
  check verification status explicitly.
- Money is always integer cents (sen), never floats — a rounding bug here is
  a real-money bug.

## When touching this code
- Any change here needs a test covering: normal flow, auto-confirm timeout
  path, and a failed/declined payment path.
- If you're unsure whether a change affects the escrow timing, ask before
  proceeding — this is the one area where "ship fast" is the wrong default.
