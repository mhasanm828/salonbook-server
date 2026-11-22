# SalonBook — Server

Salon Appointment Booking Platform — backend API.

Customers browse salon services and request appointments online. The admin
manages services, confirms or cancels appointment requests, manages customers,
and monitors Stripe payments.

## Important Features

- Public service listing with search, category filter and price sorting
- Better Auth (email/password + Google) with role and blocked fields
- JWT/session verification middleware with admin/customer role guards
- Appointment booking with duplicate slot conflict protection
- Admin service, appointment and user management
- Stripe Checkout; payment status changes only via verified webhook
- Profile read/update (role and blocked status cannot be self-changed)

## Technology Stack

- Node.js + Express.js (TypeScript)
- MongoDB with Mongoose
- Better Auth + JWT authentication and authorization
- Stripe (Checkout + Webhook)
- ImgBB (image hosting)

## Installation

```bash
npm install
cp .env.example .env
# fill in the values in .env (never commit .env)
```

## Run Locally

```bash
npm run dev     # development (watch mode)
npm run build:tsc   # compile TypeScript
npm start       # run compiled server
```

Server runs on `http://localhost:5000` by default.
Health check: `GET /api/health`

## API Overview

- `GET /api/services` — public active services (`?search&category&sort=price-asc|price-desc`)
- `GET /api/services/:id` — public service details
- `POST|PATCH|DELETE /api/services...` — admin service management
- `POST /api/appointments` — customer books (role: customer)
- `GET /api/appointments/me` — customer's own appointments
- `PATCH /api/appointments/:id/confirm|cancel` — confirm/cancel flows
- `GET /api/admin/overview`, `GET /api/admin/users`, block/unblock — admin
- `POST /api/payments/checkout` — Stripe Checkout for confirmed appointments
- `POST /api/payments/webhook` — Stripe webhook (raw body, verified signature)
- `GET /api/payments/transactions` — admin transaction list
- `GET|PATCH /api/profile` — own profile

## Creating the Admin Account

Admin accounts are never created through public registration:

1. Register the account from the client with Sign Up.
2. Run `npm run make-admin -- admin@example.com` in this server folder.
3. Sign in again — the account now has the admin role.

## Required Environment Variables

Names only — never commit actual secret values.

- `PORT`
- `CLIENT_URL`
- `MONGODB_URI`
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_CURRENCY` (optional, default `bdt`)
- `IMGBB_API_KEY`

## Links

- Live Website: https://salonbook-client-sigma.vercel.app
- Live API: https://salonbook-server-nu.vercel.app
- Client Repository: _to be added_
- Server Repository: this repository
