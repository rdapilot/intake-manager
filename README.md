# Intake & Requisition Manager

A simple full-stack procurement intake and requisition workflow starter built with:

- React + TypeScript + Vite
- Express + TypeScript
- PostgreSQL-ready backend with an in-memory fallback

## What this starter includes

- Dynamic form template builder for intake and requisition forms
- Employee request submission with required field validation
- Auto-routing to line manager and budget owner
- Optional routing to Legal and InfoSec for risky categories
- Consolidation and bundling queue
- Procurement review workspace
- Final approval workspace with registrar / AI verification placeholders
- Notifications center
- Audit trail page
- ERP/P2P purchase request export endpoint
- Hugging Face / OCR configuration placeholders in the backend

## Project structure

- `frontend/` React application
- `backend/` Express API and sample data layer

## Run locally

### 1. Backend

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

Backend runs on `http://localhost:4000`.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`.

## Environment variables

Backend supports these values:

- `PORT`
- `DATABASE_URL`
- `HUGGING_FACE_API_KEY`
- `OCR_PROVIDER_URL`
- `REGISTRAR_API_URL`

If `DATABASE_URL` is omitted, the backend uses seeded in-memory data so the UI can still run.

## Database

A starter PostgreSQL schema is included at `backend/src/db/schema.sql`.

## Suggested next steps

1. Connect authentication and role-based access.
2. Replace the placeholder verification service with real registrar / proving integrations.
3. Add file upload + OCR extraction for supplier documents.
4. Add background jobs and email / Slack / Teams notifications.
5. Map ERP export fields to your actual ERP or P2P platform.
