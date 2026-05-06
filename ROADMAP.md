# Room Rent Manager Node + React Migration Roadmap

This roadmap is based on the current Laravel project in `/var/www/html/room_rent_manager`.
The goal is to rebuild the same business functionality with a Node.js API and React frontend, while keeping the feature behavior compatible with the existing app.

## 1. Current App Summary

### Core modules

- Authentication and profile management
- Dashboard with month filter, dues summary, received summary, electricity summary, quick invoice creation, and due-payment collection
- Tenant management with Aadhaar image uploads, room availability validation, owner scoping, water-charge settings, advance-payment flag, and transaction history
- Invoice management with create/edit/delete/list, electricity calculation, water charge, payment tracking, due status, close/checkout flow, due exclusion, and PDF download
- Electricity report with month and tenant filters, total units, total electricity cost, and paginated records
- Database schema viewer utility

### Current roles and access rules

- `SA`: super admin, can see all tenants and invoices.
- `A`: admin/owner, can see only tenants where `tenants.parent_id` equals the logged-in user ID.
- Most business data is scoped through the tenant owner relationship.

### Current calculation constants

- Electricity rate defaults to `10` when config is missing.
- Current Laravel code uses both `ELECTRIC_RATE` and `electric_rate` in different views; the Node app should normalize this as one setting.

## 2. Target Stack

### Backend

- Node.js with Express or Fastify
- TypeScript
- Prisma ORM
- PostgreSQL for production, SQLite acceptable for local development
- JWT or secure cookie session authentication
- Zod validation for request payloads
- Multer or similar upload middleware for Aadhaar images
- PDFKit, Puppeteer, or React PDF for invoice PDF generation

### Frontend

- React with Vite
- TypeScript
- React Router
- TanStack Query for server state
- React Hook Form with Zod validation
- Tailwind CSS
- Component set built around tables, dialogs, forms, filters, badges, and compact dashboard cards

### Proposed folder structure

```text
node_react_migration/
  ROADMAP.md
  app/
    api/
    web/
    shared/
```

When implementation starts, `app/api` should contain the Node API and `app/web` should contain the React app.

## 3. Data Model To Recreate

### users

- `id`
- `name`
- `email`
- `password_hash`
- `email_verified_at`
- `remember_token` or replacement session mechanism
- `user_type`: `SA` or `A`
- timestamps

### tenants

- `id`
- `parent_id`: nullable user owner ID
- `name`
- `phone`
- `room_no`
- `start_date`
- `rent_amount`
- `aadhaar_image`: current app stores JSON array of paths
- `status`: `active` or `close`
- `is_water_charge`
- `water_charge`
- `is_advanced`
- timestamps

Rules:

- New tenants default to `active`.
- Active tenant room numbers must be unique.
- If `is_water_charge` is false, `water_charge` must become `0`.
- Aadhaar uploads support multiple image files.

### invoices

- `id`
- `room_no`: nullable legacy field, current UI uses tenant room instead
- `tenant_id`
- `month`: `YYYY-MM`
- `electricity_units`: current meter reading
- `electricity_charge`
- `water_charge`
- `total_amount`
- `received_amount`
- `is_excluded`
- `status`: legacy unpaid/paid value, but current UI calculates payment state from amounts
- timestamps

Rules:

- Create invoice total = tenant rent + electricity charge + water charge.
- If `closer` is true and tenant has `is_advanced`, rent becomes `0`.
- If `closer` is true, tenant status becomes `close` after invoice creation.
- Payment received during create creates a transaction.
- Increasing received amount during edit creates a transaction for only the added amount.
- Due amount = `total_amount - received_amount`.
- Due payment list excludes invoices where `is_excluded` is true.

### transactions

- `id`
- `tenant_id`
- `invoice_id`
- `amount`
- `payment_mode`: `Cash`, `UPI`, `Bank Transfer`, or compatible string
- `payment_date`
- timestamps

### electricity_units

- Existing table has `invoice_id` and `unit`.
- Current app does not meaningfully use this table in UI logic.
- Migration decision: either keep for compatibility or remove after data review.

### payment_histories

- Existing table has `invoice_id` and `received_amount`.
- Current app appears to use `transactions` instead.
- Migration decision: keep read-only import compatibility or drop from new active model.

## 4. API Roadmap

### Auth API

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `PATCH /api/profile`
- `PATCH /api/profile/password`
- `DELETE /api/profile`

Acceptance checks:

- Login protects all dashboard, tenant, invoice, and electricity endpoints.
- `SA` and `A` data visibility matches Laravel behavior.
- Passwords are hashed with bcrypt or argon2.

### Dashboard API

- `GET /api/dashboard?month=YYYY-MM`
- `GET /api/dashboard/due-tenants`
- `GET /api/tenants/:id/due-invoices`
- `POST /api/invoices/:id/payments`

Acceptance checks:

- Month summary returns pending count, due amount, received amount.
- Electricity month summary returns total electricity amount and calculated units.
- Due tenants list includes only tenants with at least one due, non-excluded invoice.
- Adding payment updates invoice `received_amount` and creates a transaction.

### Tenant API

- `GET /api/tenants`
- `POST /api/tenants`
- `GET /api/tenants/:id`
- `PATCH /api/tenants/:id`
- `DELETE /api/tenants/:id`
- `GET /api/tenants/:id/transactions`

Acceptance checks:

- Tenant list supports search, pagination, and owner column for `SA`.
- Room availability blocks duplicate active rooms.
- Tenant form supports Aadhaar multi-upload previews.
- Transaction history matches the Laravel table: amount, mode, payment date, invoice month, logged date.

### Invoice API

- `GET /api/invoices`
- `POST /api/invoices`
- `GET /api/invoices/:id`
- `PATCH /api/invoices/:id`
- `DELETE /api/invoices/:id`
- `GET /api/invoices/:id/pdf`
- `GET /api/tenants/:tenantId/last-units?month=YYYY-MM`

Acceptance checks:

- Invoice list shows room, tenant, month, current units, consumed units, electricity charge, water charge, total, received, due/paid status, owner for `SA`, and actions.
- Consumed units on list are calculated from the previous invoice for the same tenant with earlier month and positive electricity units.
- Invoice creation calculates electricity from current units minus last units.
- First rent month behavior matches current form: electricity charge and water charge are `0` when invoice month equals tenant start month.
- PDF filename matches `Invoice_{tenant_name_slug}_{month}.pdf`.
- PDF includes electricity display in the current format: `current - previous = used`.

### Electricity API

- `GET /api/electricity?month=YYYY-MM&tenantId=id&page=1`

Acceptance checks:

- Supports month filter, tenant filter, pagination.
- Shows current unit, used units, rate, and cost.
- Total units are back-calculated as `total electricity charge / electric rate`.

### Utility API

- `GET /api/database-schema`

Acceptance checks:

- Optional admin-only route.
- Supports the selected database driver.
- Can be deferred if not needed for production.

## 5. Frontend Roadmap

### App shell

- Authenticated layout with sidebar/topbar navigation.
- Routes: dashboard, tenants, tenant create/edit/show, invoices, invoice create/edit, electricity, profile.
- Shared UI: tables, pagination, filters, dialogs, toast messages, confirm delete, loading and empty states.

### Dashboard page

- Month filter.
- Summary cards: pending invoices, due amount, received amount, current-month electricity units, current-month electricity cost.
- Create invoice dialog.
- Due payments tenant selector.
- Due invoice table with inline amount, mode, date, save payment, and PDF link.

### Tenants page

- Searchable/paginated table.
- Add/edit tenant form.
- Aadhaar multi-image upload and preview.
- Status badges.
- Water-charge toggle that reveals/hides water amount.
- Advanced-paid toggle.
- Transaction history modal.

### Invoices page

- Searchable/paginated table.
- Add/edit invoice form.
- Tenant select with rent, start month, water config.
- Month picker.
- Last-unit lookup.
- Unit-difference and electricity-charge calculation.
- Water-charge logic.
- Received amount, payment mode, payment date.
- Create closer invoice flow.
- Exclude-from-dues toggle on edit.
- PDF download.

### Electricity report

- Month and tenant filters.
- Summary cards.
- Paginated usage table.

## 6. Implementation Phases

### Phase 0: Project Bootstrap

- Create `app/api` Node TypeScript project.
- Create `app/web` React TypeScript project.
- Add shared linting, formatting, and environment examples.
- Choose database provider and define Prisma schema.

Deliverable:

- Both apps start locally.
- Health check endpoint works.
- React shell renders login route.

### Phase 1: Database and Auth

- Implement Prisma schema and migrations.
- Seed one `SA` user and one `A` user.
- Implement register/login/logout/me/profile APIs.
- Add React auth pages and protected routes.

Deliverable:

- Users can log in and only see protected app pages after auth.

### Phase 2: Tenant Module

- Implement tenant CRUD API.
- Implement owner scoping.
- Implement room availability validation.
- Implement Aadhaar upload storage.
- Build tenant list and form UI.
- Build transaction history modal shell.

Deliverable:

- Tenant workflows match the Laravel app.

### Phase 3: Invoice Module

- Implement invoice CRUD API.
- Implement last-units endpoint.
- Implement invoice calculation service.
- Implement payment transaction creation.
- Build invoice list and form UI.
- Build closer invoice flow.

Deliverable:

- Invoice create/edit/list/delete and payment tracking match the Laravel app.

### Phase 4: Dashboard

- Implement dashboard summary APIs.
- Implement due tenants and due invoices APIs.
- Build dashboard summary, quick invoice dialog, and inline payment flow.

Deliverable:

- Dashboard gives the same financial and dues workflow as Laravel.

### Phase 5: PDF and Electricity Report

- Implement invoice PDF generation.
- Implement electricity report API.
- Build electricity report UI.

Deliverable:

- PDFs and electricity reports match current calculations and display.

### Phase 6: Data Migration

- Export existing Laravel data.
- Import users, tenants, invoices, transactions, and file paths.
- Decide handling for `payment_histories` and `electricity_units`.
- Verify totals against the old app.

Deliverable:

- New app can run against migrated real data with matching totals.

### Phase 7: Hardening

- Add API tests for auth, scoping, tenant validation, invoice math, payments, dashboard summaries, and PDF filename/data.
- Add frontend smoke tests for main workflows.
- Add production build scripts.
- Add deployment docs.

Deliverable:

- Production-ready Node/React replacement.

## 7. Compatibility Risks To Resolve Early

- Dashboard quick invoice currently submits with `fetch` and expects JSON, but Laravel controller redirects. The new app should make this flow JSON-first.
- The app uses `ELECTRIC_RATE` and `electric_rate` inconsistently; standardize to one environment/config value.
- `electricity_units` table exists but the active logic uses invoice readings and charges.
- `payment_histories` exists but the active payment history feature uses `transactions`.
- Invoice edit currently avoids fetching previous units on initial load, but there is no stored previous-unit column. The React app should make this behavior explicit.
- Tenant owner selection currently trusts hidden `parent_id` in the form. The Node API should set owner from the authenticated user unless `SA` explicitly assigns another owner.

## 8. Suggested First Build Step

Start with Phase 0 and Phase 1:

1. Scaffold `app/api` with Express, TypeScript, Prisma, Zod, auth middleware, and a health endpoint.
2. Scaffold `app/web` with Vite, React, TypeScript, Tailwind, React Router, and a protected layout.
3. Add the Prisma schema matching the Laravel tables.
4. Implement login and `GET /api/auth/me`.

After that foundation is running, the tenant module should be built first because invoices, dashboard, and electricity reporting all depend on tenant data and owner scoping.

## 9. Migration Progress

### Completed initial foundation

- Created the `app/api`, `app/web`, and `app/shared` workspace structure.
- Added Express + TypeScript API bootstrap with health, auth, profile, and dashboard placeholder routes.
- Added Prisma schema for users, tenants, invoices, transactions, electricity units, and payment histories.
- Added local SQLite environment, generated initial SQL migration, pushed schema, and seeded one `SA` plus one `A` user.
- Added Vite + React + TypeScript app shell with login, protected routes, sidebar navigation, dashboard summary cards, and module placeholders.
- Added build/typecheck scripts and local setup notes in `README.md`.

### Next

- Build Phase 2 tenant CRUD with owner scoping, room availability validation, Aadhaar upload handling, and transaction history display.
