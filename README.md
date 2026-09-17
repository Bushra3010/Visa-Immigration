# Visa, Immigration & Travel Booking Platform

Next.js 16 (App Router) + Supabase implementation of the platform described in
`Visa-Immigration-Travel-Platform-PRD.md`: an immigration consultancy funnel
(eligibility → lead → counsellor → documents → application) combined with a
supplier-agnostic flight + hotel booking engine, customer dashboard and role-based
Admin Panel.

## Quick start

```bash
npm install
cp .env.example .env.local   # fill in Supabase keys (see below)
npm run dev                  # http://localhost:3000
```

Without Supabase keys the public site, eligibility/consultation forms (not
persisted — you'll see a "development mode" notice) and flight/hotel **search**
all work against the sandbox supplier. Login, dashboards, booking and the Admin
Panel need Supabase.

### Supabase setup

1. Create a Supabase project (or run `supabase start` locally with the Supabase CLI).
2. Apply `supabase/migrations/*.sql` in order, then `supabase/seed.sql`
   (`supabase db push` / `supabase db reset`, or paste into the SQL editor).
3. Put the project URL, anon key and service-role key into `.env.local`.
4. Auth → URL configuration: set Site URL to `NEXT_PUBLIC_SITE_URL` and add
   `<site>/auth/confirm` as a redirect URL.
5. Register an account on the site, then promote it in the SQL editor:
   `update profiles set role = 'super_admin' where email = 'you@example.com';`
   Further staff are promoted from **Admin → Users**.

### Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | Route type generation + `tsc` |
| `npm test` | Vitest unit tests (markup engine, eligibility scoring, upload validation, travel validation, sandbox suppliers) |

## Architecture

```
src/
  app/(site)/        Public website — static/SSG where possible for SEO (§5, §6.1–6.4, §11)
  app/(auth)/        Register, login, forgot/reset password (§10)
  app/dashboard/     Customer dashboard (§6.9, §6.10)
  app/admin/         Admin Panel, sections filtered by role (§8, §9)
  app/checkout/      Payment step
  app/api/           Route handlers: travel search/revalidation, places, CSV reports
  lib/travel/        Supplier abstraction (§12.2): types.ts contracts, providers/, registry.ts,
                     markup.ts (pure pricing engine), service.ts (integration layer)
  lib/payments/      Payment gateway abstraction (§8.7)
  lib/bookings/      Booking start, fulfilment after payment, cancellation (§7, §8.8)
  lib/leads/         Eligibility/consultation/enquiry validation, scoring, server actions
  lib/admin/         Admin mutations (all permission-checked + audited)
  lib/notifications/ Email/WhatsApp/in-app dispatch abstraction (§8.9)
  lib/content/       Placeholder country / visa content (moves to CMS tables later)
supabase/migrations  Schema, RLS policies, storage bucket, auto-assignment trigger
```

**Security model (§9, §12.3)**

- Row-Level Security on every table mirrors the role matrix; staff pages read and write
  through the user's RLS-bound client so the database enforces scoping (e.g. counsellors
  only see assigned leads). The service-role client is used only after explicit checks
  (public lead capture, booking/payment state machines, audit logs, notifications).
- Supplier, payment and service-role secrets are server-only env vars; the API Management
  screen only shows whether credentials are configured.
- Customer-facing prices never expose supplier cost or margin.
- Uploads: private bucket, per-user paths, size + magic-byte validation, short-lived signed
  URLs, access audit log.
- Rate limiting and honeypots on public forms; atomic status transitions guard against
  double payment/booking/cancellation; CSV exports are escaped against formula injection;
  security headers (HSTS, frame denial, nosniff) set globally.

**Adding a real supplier**: implement `FlightProvider` / `HotelProvider` from
`src/lib/travel/types.ts` in `src/lib/travel/providers/`, register it in `registry.ts`,
add its `supplier_configs` row, set `FLIGHT_PROVIDER` / `HOTEL_PROVIDER`, and read its
credentials from env vars inside the adapter. Nothing else changes.

## Status

### Built (foundation milestone)

- Public site: homepage with hero, CTAs, destinations, categories and travel widget;
  8 country pages, 11 visa service pages, service landing pages, immigration overview,
  About/Contact/FAQs; metadata, canonical URLs, FAQ + Service JSON-LD, sitemap, robots.
- 7-step eligibility assessment → lead with indicative score + DB-level auto-assignment
  by country / visa category / location / load; consultation booking; contact enquiries.
- Flight search (one-way, round-trip, multi-city; filters, sorting), hotel search/detail/rates,
  Flight + Hotel combined flow under one Travel Booking ID, fare/rate revalidation with
  price-change confirmation, traveller/passport validation, checkout, post-payment supplier
  booking (PNR / confirmation), supplier-driven cancellation.
- Immigration → travel handoff: "Your visa process is complete. Plan your journey" prompt,
  bookings linked to the application, counsellor-created travel requirements.
- Customer dashboard: overview, applications + timeline, documents upload/re-upload,
  consultations, bookings, payments, messages, notifications, profile.
- Admin Panel: KPI dashboard, leads (filters, assignment, follow-ups, activity log,
  convert to application), applications (status, remarks, next action, document requests,
  review), document review queue, consultations, users & roles, counsellors
  (specialisations + performance), travel bookings + search logs, API management,
  markup rules, payments, CMS overview, immigration/travel/financial reports with CSV export.

### Sandbox stand-ins (pending Phase 2 commercial decisions, PRD §17)

| Area | Current | Needed |
|---|---|---|
| Flight supplier | `mock` provider (deterministic sample data) | Contract + sandbox credentials (TBO / Amadeus / Travelport / Duffel …) |
| Hotel supplier | `mock` provider | Contract (TBO / Hotelbeds / RateHawk / Expedia Rapid …) |
| Payment gateway | `mock` with simulated success/failure buttons | Gateway choice; implement adapter + verified webhook calling `fulfilTravelBooking` |
| Email / WhatsApp | Logged and recorded as `skipped` | Provider choice; implement channel adapters |
| Site content | Placeholder copy in `src/lib/content` | Final countries, visa list, copy, legal pages from the business |

The site currently runs on this demo data. Once live suppliers / a payment gateway are connected, set `DISABLE_MOCK_SUPPLIERS=true` and `DISABLE_MOCK_PAYMENTS=true` so the sandbox adapters can never serve real customers.

### Next up

- CMS editing screens (tables exist) and switching public pages to read from them; blog,
  testimonials, banners/offers, per-page SEO fields; site search.
- **Direct-to-storage uploads** via signed upload URLs — serverless request bodies are capped
  (≈4.5 MB on Vercel, 6 MB on Netlify), so large scans will fail through server actions in production.
- Malware scanning of uploads; field-level encryption for passport numbers.
- E-ticket / voucher PDF generation; payments for consultation and service fees.
- Shared rate-limit store (Upstash/Postgres) for multi-instance deployments.
- Generated Supabase TypeScript types (`supabase gen types`) to replace inline casts.
- Scheduled jobs: follow-up and appointment reminders.
- E2E tests (Playwright) against a seeded Supabase instance.
