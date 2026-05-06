# Room Rent Manager Node + React Migration

This is the new Node.js API and React frontend scaffold for the Room Rent Manager migration described in `ROADMAP.md`.

## Apps

- `app/api`: Express, TypeScript, Prisma, SQLite for local development.
- `app/web`: Vite, React, TypeScript, React Router, TanStack Query, Tailwind CSS.
- `app/shared`: shared constants and types.

## Local Setup

```bash
npm install
HOME=/tmp/prisma-home npm run prisma:generate
HOME=/tmp/prisma-home npm run db:push -w @room-rent/api
HOME=/tmp/prisma-home npm run seed
npm run build
```

## Run

```bash
npm run start -w @room-rent/api
npm run dev -w @room-rent/web
```

The API defaults to `http://localhost:4000/api`.
The web app defaults to `http://localhost:5173`, or the next free port if `5173` is busy.

Seeded users:

- `superadmin@example.com` / `password123`
- `owner@example.com` / `password123`
