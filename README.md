# Jai Janardan Auto

This project uses a React + TypeScript front end with a MongoDB-backed admin inventory API.

## Development seed data

To insert sample vehicles into MongoDB for local testing, set `MONGO_URI` in your backend environment and run:

```bash
npm run seed:vehicles
```

The seed script creates a batch of realistic commercial-vehicle listings and marks a subset as best sellers for the public home page.

## Local front-end and API

The frontend uses `VITE_API_BASE_URL` as the backend origin. Copy the root
`.env.example` to `.env` to configure the production backend; the frontend
appends `/api` automatically. During development, the backend origin defaults
to `http://localhost:5000` when this variable is unset. Configure the matching
frontend origin as `FRONTEND_URL` in `backend/.env`.

```bash
npm install
npm run dev
```

Then run the backend server separately from the `backend` folder if needed.

## Sell Your Vehicle review workflow

Owners can submit vehicles at `/sell-your-vehicle`. Submissions are saved as
private sell requests and are not public inventory until an Admin lists them
from **Admin → Sell Requests**. Requests can be approved for later manual
listing, published directly, or rejected. Published vehicles use the existing
Vehicle collection and public inventory APIs.

## Admin authentication and password recovery

Copy `backend/.env.example` to `backend/.env` and configure `MONGO_URI`,
`ADMIN_EMAIL`, `ADMIN_PASSWORD`, and `ADMIN_NAME` for the initial admin account.
On its first successful sign-in, the existing configured admin account is
created once in MongoDB with a bcrypt password hash. Existing bcrypt hashes
are verified directly, and earlier scrypt hashes remain supported. Later
sign-ins are verified against the stored hash; changing environment
credentials does not overwrite an existing account or its password. Existing
browser sessions need to sign in again after this cookie-session migration.

Admin sessions are opaque, revocable MongoDB-backed sessions in HTTP-only
cookies. Remember Me sets a 30-day cookie; otherwise the browser receives a
session cookie. Sessions expire server-side after 30 days or 12 hours,
respectively. Resetting a password invalidates all active sessions for that
account. MongoDB automatically creates the unique admin-email index and the
TTL index for expired sessions when the models are first used. No existing
vehicle or sell-request records need to be migrated.

Password reset email requires all of `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`,
`SMTP_PASS`, `MAIL_FROM`, and `FRONTEND_URL`. The backend reports a clear
configuration error until these are set; it never reports a reset email sent
when SMTP is unavailable. Use an SMTP provider's TLS configuration in
production and an HTTPS `FRONTEND_URL`. Set `COOKIE_SAME_SITE=none` only when
the production frontend and API are on different sites; cookies are Secure in
production and HTTPS is required.

The contact form continues to open its WhatsApp handoff and now also persists
valid customer enquiries through `POST /api/enquiries`. The authenticated
dashboard and Enquiries page read those records through `GET /api/enquiries`;
status changes, if used, are protected by the same admin session.

Additional admin/staff users can be created without duplicating an email by
setting `NEW_ADMIN_EMAIL`, `NEW_ADMIN_NAME`, `NEW_ADMIN_PASSWORD` (at least 12
characters and no more than 72 UTF-8 bytes), and optionally
`NEW_ADMIN_ROLE=admin` or `staff` in `backend/.env`, then running
`npm run admin:create` from the backend directory. Remove those temporary
`NEW_ADMIN_*` values from the environment after provisioning. The user model
preserves each account's name, email, role, and optional profile image.

`POST /api/auth/login`, `/forgot-password`, `/reset-password`, `/logout`, and
`GET /api/auth/me` are the authentication endpoints. The former
`/api/admin-auth` route remains available for compatibility. Admin vehicle,
brand, upload, and Sell Requests mutations require an authenticated session;
public inventory reads, vehicle image submissions, and public Sell Your
Vehicle submissions remain available.

## Vehicle categories and brands

The backend creates the two active categories and their default brands when MongoDB connects:

- Commercial Vehicles (`commercial`): Tata, Mahindra, Ashok Leyland, Eicher
- Cars (`cars`): Toyota, Tata, Maruti Suzuki, Hyundai

Categories and brands are stored in MongoDB. The Admin **Categories** page manages brands; active brands are loaded dynamically by Add Vehicle and the public vehicle filters. A brand is unique within its category, so Tata can be present in both.

Category and brand APIs:

- `GET /api/categories`
- `GET /api/brands?category=commercial`
- `GET /api/brands?category=cars`
- `POST /api/brands`
- `PATCH /api/brands/:id`
- `DELETE /api/brands/:id`

New vehicle records store `category` and `categoryType` as `commercial` or `cars`. Existing records are preserved; legacy vehicle subtype values are classified only when their category is unambiguous.
