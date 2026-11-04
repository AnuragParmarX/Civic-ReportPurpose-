# CivicConnect

CivicConnect is an academic civic-engagement demonstration for reporting and
tracking community issues in Indore, Madhya Pradesh. Citizens can register,
submit reports, attach optional evidence and GPS coordinates, vote once per
report, and inspect live issue data. A protected academic administrator
workspace supports moderation and status updates. It is not a government
system and administrator accounts do not represent real municipal officials.

## Architecture

- `client/`: React 19 + Vite single-page application
- `server/`: Express API with JWT authentication and Mongoose
- MongoDB: persistent users, issues, votes, status history, and moderation flags
- Local image storage: `server/uploads/issues`, served by the API
- OpenStreetMap tiles through React Leaflet; no paid map key is required

## Features

- Citizen registration and login with bcrypt password hashing
- JWT-protected report creation, voting, photo uploads, and session persistence
- Persistent one-vote-per-citizen-per-report with vote removal
- Administrator verification with pending, approved, and rejected states
- Server-enforced report limits, cooldowns, duplicate confirmation, and abuse flags
- Optional GPS coordinates and validated JPG/PNG/WebP evidence uploads
- Search, status/category filtering, report details, and persistent analytics
- Interactive Indore issue map using saved coordinates only
- Administrator-only pagination, search, filters, status/priority updates,
  resolution notes, suspicious/duplicate flags, and status history

## Screenshots

Add project screenshots here for the college submission, for example:

1. Citizen dashboard and report list
2. Report submission form with optional GPS/photo
3. Interactive issue map
4. Administrator workspace

## Requirements

- Node.js 18 or newer
- MongoDB 6+ locally or a MongoDB Atlas database

## Installation and environment

Install dependencies:

```powershell
cd "D:\7th SEM\Major Project\CivicConnect\server"
npm install
cd "..\client"
npm install
```

Create `server/.env` from [`server/.env.example`](./server/.env.example):

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/civicconnect
JWT_SECRET=replace-with-a-long-random-secret
JWT_EXPIRES_IN=1d
CLIENT_ORIGIN=http://localhost:5173
ADMIN_NAME=Demo Administrator
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=use-a-local-password-of-at-least-12-characters
```

Create `client/.env` from [`client/.env.example`](./client/.env.example):

```env
VITE_API_URL=http://localhost:5000/api
```

Do not commit either `.env` file. Frontend environment variables are public
configuration; never put JWT secrets or database credentials in the client.

## Database setup

Start MongoDB locally, or replace `MONGODB_URI` with a MongoDB Atlas URI. The
application creates collections and indexes through Mongoose when used.

Create the local academic administrator with environment-configured credentials:

```powershell
cd "D:\7th SEM\Major Project\CivicConnect\server"
npm run seed:admin
```

Public registration always creates a citizen account. The seed command
upserts the configured administrator and hashes the password with bcrypt.

## Start the applications

In one terminal:

```powershell
cd "D:\7th SEM\Major Project\CivicConnect\server"
npm run dev
```

In another terminal:

```powershell
cd "D:\7th SEM\Major Project\CivicConnect\client"
npm run dev
```

Open `http://localhost:5173`. The API is available at
`http://localhost:5000`, with health status at `/api/health`.

## API endpoints

### Public/authenticated citizen endpoints

- `GET /api/health`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/logout`
- `GET /api/issues`
- `GET /api/issues/:id`
- `POST /api/issues` (authenticated citizen only; administrators cannot submit reports)
- `POST /api/issues/:id/vote` (authenticated citizen)
- `DELETE /api/issues/:id/vote` (authenticated citizen)
- `POST /api/uploads/issue-image` (authenticated citizen, max 5 MB)

### Administrator endpoints

- `GET /api/admin/stats`
- `GET /api/admin/issues`
- `PATCH /api/admin/issues/:id`
- `PATCH /api/admin/issues/:id/flag`
- `DELETE /api/admin/issues/:id` (administrator; permanently deletes a report and its votes)

Administrator endpoints require a JWT for a user with `role: "admin"`.

## Validation commands

```powershell
cd "D:\7th SEM\Major Project\CivicConnect\client"
npm run build
npm run lint

cd "..\server"
npm run check
```

## Known limitations and future improvements

- Full end-to-end testing requires a running MongoDB instance.
- Local image storage is suitable for the academic demo; production would use
  object storage with access controls and cleanup policies.
- OpenStreetMap tiles are public and subject to their usage policy.
- No email verification, password reset, refresh-token rotation, or audit-log
  export is implemented.
- The map does not reverse-geocode coordinates and reports without GPS are not
  placed on it.
- Automated integration/browser test coverage should be added for deployment.
