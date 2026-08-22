# Product Requirements Document: Microwarehousing Marketplace

**Working name:** TBD
**Market:** Malaysia (launch), ASEAN expansion planned
**Version:** v0.1 — Draft

---

## 1. Vision

An asset-light, two-sided marketplace that connects people and small businesses with spare space to people and SMEs who need short- or mid-term storage. Think Airbnb's booking simplicity applied to microwarehousing — no long leases, no commercial contracts, just space that gets rented by the sqft, on demand.

## 2. Problem

- SMEs in ASEAN (e-commerce sellers, traders, small F&B operators) frequently need overflow storage but can't justify a commercial warehouse lease for short or seasonal needs.
- Meanwhile, a large amount of underused space exists — spare rooms, garages, shoplot back rooms, unused warehouse bays — with no easy way for owners to monetize it.
- Existing options (self-storage chains, commercial warehousing) are inflexible, expensive at small scale, and not built for short-term or SME use cases.

## 3. Users

### Persona A: Space Owner ("Host")
Owns underused space and wants passive income with minimal effort. May be an individual (spare room/garage) or a small business (shoplot, warehouse bay).

**Goals:** list quickly, get discovered, get paid reliably, minimal liability.

### Persona B: Space Seeker ("Renter")
Needs flexible storage without a long-term commitment. Mostly SMEs (e-commerce sellers, traders, small F&B businesses) but the product experience is designed to feel simple enough for individual consumers too.

**Goals:** find nearby space fast, trust that it's legitimate, book without friction, access goods when needed.

## 4. Business Model

| Area | Decision |
|---|---|
| Launch market | Malaysia |
| Primary segment | B2C-style UX/flow; mixed renter base (individuals + SMEs) from day one |
| Listing types | Any spare space + purpose-built micro-warehouse bays; host self-categorizes |
| Access model | "Visiting" — renter or their representative accesses the space directly (self-access code or host-coordinated). Delivery-partner pickup/drop-off is a planned v1.5 add-on, not built at launch |
| Revenue | Commission on each booking |
| Pricing | Host sets price freely; platform shows a suggested price range based on size/location/category (data-informed, not rigid) |
| Booking duration | Flexible — host chooses to offer daily and/or monthly minimums |
| Goods protection | Capped platform guarantee at launch (e.g. up to a fixed RM amount per claim, verified against drop-off photos), upgrading to a formal insurance partnership once booking volume justifies it |
| Logistics | Not built in-house. Partner integration (Lalamove/Grab Express-style) planned post-MVP |

## 5. Core User Journeys

### Host journey
1. Sign up, verify identity (NRIC/business registration)
2. Create a listing: photos, size (sqft), category, price, access rules, prohibited items
3. Receive booking requests / auto-accept bookings
4. Coordinate access with renter (via in-app messaging)
5. Get paid on schedule, minus commission
6. Manage active bookings via dashboard

### Renter journey
1. Sign up, verify identity
2. Search by location, size, price, category, duration
3. View listing detail — photos, host rating, terms, prohibited items
4. Book and pay (held in escrow until move-in confirmed)
5. Coordinate access with host via in-app messaging
6. Store / retrieve goods per agreed access terms
7. Confirm move-out, leave a review

## 6. Feature Scope

### Must-have — v1 (MVP)
- User accounts with ID verification (host and renter)
- Listing creation: photos, size, category, price, location, access rules, prohibited items
- Search and filter: location, size, price range, category, duration
- Listing detail page with host rating and reviews
- Booking flow with date range (daily and/or monthly, host-defined)
- Payment processing with escrow held until move-in is confirmed
- Automatic commission deduction on host payout
- In-app messaging (no phone number exposure pre-booking)
- Basic host dashboard: active bookings, upcoming move-outs, earnings
- Post-rental ratings and reviews (both directions)
- Capped damage/loss guarantee, verified via drop-off photos

### Nice-to-have — v1.5+
- Delivery partner integration (pickup/drop-off without visiting)
- Formal insurance partnership (replacing capped guarantee)
- Host CRM: multi-renter occupancy calendar, automated rent reminders
- Recurring/subscription bookings with auto-renewal
- Formal dispute resolution workflow
- Periodic space re-verification (host re-uploads photos to prevent bait-and-switch)
- Smart/dynamic pricing suggestions based on real booking data

### Explicitly out of scope for v1
- In-house logistics fleet or dispatch
- Full insurance underwriting
- Enterprise/B2B contract features (bulk quotes, dedicated account management, API access)
- Multi-country support (Malaysia only at launch)

## 7. Trust & Safety Considerations

- ID verification required before a listing can go live or a first booking can be made
- Prohibited-items list enforced at listing creation (no perishables, hazardous materials, illegal goods)
- Drop-off photo verification ties the capped guarantee to evidence, reducing fraud on both sides
- Ratings/reviews visible pre-booking to build trust signals over time

## 8. Open Questions / Risks

- **Access coordination without logistics**: without a delivery layer, how much friction exists in host↔renter coordination for a simple "visit and drop off" flow? Needs early user testing.
- **Guarantee cap sizing**: what RM cap is generous enough to build trust but not create adverse selection (people storing high-value goods specifically to claim)?
- **Verification friction**: ID verification is necessary for trust but adds signup friction — needs a smooth onboarding flow to avoid killing conversion.
- **Category-mixed listings**: spare rooms and purpose-built warehouse bays have very different trust/quality expectations — may need different UI treatment or filtering even though both live on one platform.
- **Pricing guidance**: no market data yet to inform the "suggested price range" — early listings may need manual curation.

## 9. Suggested Success Metrics (v1)

- Number of active listings (supply side liquidity)
- Search-to-booking conversion rate
- Repeat booking rate (renter retention)
- Host payout reliability / time-to-payout
- Guarantee claim rate (trust/safety health check)
- Average time from listing creation to first booking

## 10. Next Steps

1. Validate the "visiting" access model with a handful of real hosts/renters before building
2. Nail down pricing data sources (manual comps in Malaysia for v1)
3. Choose an ID verification provider suited for Malaysia
4. Move into technical architecture and build planning
