# CivicConnect API

This is the Node.js/Express backend for the Indore-only CivicConnect application.

## Setup

1. Install Node.js 18 or newer.
2. From `server/`, run `npm install`.
3. Copy `.env.example` to `.env`.
4. Set `MONGODB_URI` to a local MongoDB URI or a MongoDB Atlas connection string.
5. Replace `JWT_SECRET` with a long random value. Do not commit `.env`.
6. Start the API with `npm run dev` or `npm start`.

The API listens on port `5000` by default. The Vite client is allowed by default
at `http://localhost:5173`; change `CLIENT_ORIGIN` if needed.

## Endpoints

- `GET /api/health`
- `POST /api/auth/register` (public citizen registration)
- `POST /api/auth/login`
- `GET /api/auth/me` (authenticated)
- `POST /api/auth/logout` (authenticated; the client clears its JWT)
- `POST /api/uploads/issue-image` (authenticated citizen; JPG, PNG, or WebP up to 5 MB)
- `GET /api/issues?page=1&limit=10&search=pothole&status=Reported&category=Roads%20%26%20Potholes`
- `GET /api/issues/:id` (MongoDB `_id` or report identifier)
- `POST /api/issues` (authenticated)
- `PATCH /api/issues/:id` (administrator)
- `PATCH /api/issues/:id/status` (administrator)
- `GET /api/admin/stats` (administrator)
- `GET /api/admin/issues` (administrator; paginated search and filters)
- `PATCH /api/admin/issues/:id` (administrator; status, priority, and notes)
- `PATCH /api/admin/issues/:id/flag` (administrator; suspicious/duplicate flag)
- `DELETE /api/admin/issues/:id` (administrator; permanently deletes a report and its votes)
- `POST /api/issues/:id/vote` (authenticated citizen; one vote per user)
- `DELETE /api/issues/:id/vote` (authenticated citizen; removes that citizen's vote)

Issue list and detail responses include `voteCount` and `hasVoted` when an
authenticated user is supplied. Votes are stored in the `Vote` collection with
a unique compound index on issue and user, so duplicate requests cannot create
multiple active votes.

Issue photos are stored persistently in `server/uploads/issues` and served from
`/uploads/issues/<filename>`. The frontend sends the resulting URL with the
issue report; photo upload remains optional.

The client Community Map uses React Leaflet with free OpenStreetMap tiles. It
only places reports that have saved latitude and longitude values; reports
without coordinates remain available in the reports list.

## Example requests

Register a citizen:

```powershell
Invoke-RestMethod -Method Post -Uri http://localhost:5000/api/auth/register `
  -ContentType "application/json" `
  -Body '{"name":"Demo Citizen","email":"citizen@example.com","password":"demo-password-123"}'
```

Create a report using the returned token:

```powershell
Invoke-RestMethod -Method Post -Uri http://localhost:5000/api/issues `
  -Headers @{ Authorization = "Bearer YOUR_TOKEN" } `
  -ContentType "application/json" `
  -Body '{"title":"Pothole near bus stop","category":"Roads & Potholes","locality":"Vijay Nagar","description":"A deep pothole is affecting traffic."}'
```

The server does not create an administrator account during public registration
and does not contain real government integration.

## Local demo administrator

Public registration can only create citizen accounts. To create or update the
local academic-demo administrator, configure these variables in `server/.env`:

```env
ADMIN_NAME=Demo Administrator
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=use-a-long-local-password
```

Then run:

```powershell
npm run seed:admin
```

The password is bcrypt-hashed before storage. Do not commit the `.env` file or
use a real municipal administrator account for this demonstration.
