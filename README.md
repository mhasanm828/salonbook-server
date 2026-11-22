# SalonBook — Server

Salon Appointment Booking Platform — backend API.

Customers browse salon services and request appointments online. The admin
manages services, confirms or cancels appointment requests, manages customers,
and monitors Stripe payments.

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
npm run build   # compile TypeScript
npm start       # run compiled server
```

Server runs on `http://localhost:5000` by default.
Health check: `GET /api/health`

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
- `IMGBB_API_KEY`

## Links

- Live Website: _to be added after deployment_
- Client Repository: _to be added_
- Server Repository: this repository
