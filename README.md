# BRM Renewal Calendar

A full‑stack application that ingests Purchase Agreement PDFs, extracts key terms (vendor, dates, notice period, renewal terms), and presents them in a Contracts table and a Calendar with ICS export/email. Includes OCR fallback for scanned PDFs and a dual PDF preview (original + OCR/highlight).

## Table of Contents
- Overview
- Features
- Tech Stack
- Project Structure
- Setup & Running
  - Docker (recommended)
  - Local dev (without Docker)
  - Environment variables
- Architecture & Data Flow
  - Backend (FastAPI)
  - Frontend (React + TypeScript)
  - Extraction pipeline (PDF → OCR → AI → Normalize)
- Database & Models
- API Reference
- Frontend UX
- PDF Preview & Highlighting
- Calendar & ICS Export
- Emailing ICS (SMTP)
- File Storage & Cleanup
- Testing & Diagnostics
- Troubleshooting
- Roadmap / Next Steps

---

## Overview
- Upload one or more PDF agreements
- AI extracts start/end/renewal dates, renewal terms, notice period, and vendor
- Review and edit extracted values; `notice_deadline` is computed automatically
- See all events on a calendar and export/email ICS
- Preview both the original PDF and a text/OCR overlay with highlights

## Features
- Concurrent PDF processing per file
- PyMuPDF text extraction with Tesseract OCR fallback for image-only scans
- AI extraction via OpenRouter (GPT‑4); server-side validation/normalization
- Contracts CRUD + bulk clear
- Calendar event generation (notice deadline, renewal date, expiration)
- ICS export and ICS email with optional reminders
- PDF preview (original) and OCR/text‑only view with soft highlights
- Best‑effort removal of uploaded files on delete/clear

## Tech Stack
- Backend: FastAPI, SQLAlchemy, Pydantic v2, Uvicorn
- PDF/OCR: PyMuPDF (fitz), Pillow, pytesseract (Tesseract installed in backend image)
- HTTP client: httpx
- Frontend: React 18, TypeScript, Vite, Material UI (MUI), FullCalendar, Day.js, React-PDF
- DB: SQLite
- Containers: Docker + docker-compose

## Project Structure
```
brm-takehome/
  backend/
    app/
      main.py                # FastAPI app & routes
      models.py              # SQLAlchemy models
      schemas.py             # Pydantic schemas
      database.py            # DB engine/session
      pdf_extractor.py       # Text extraction + OCR + AI + normalization
      calendar_service.py    # Calendar event + ICS generation
    Dockerfile
    requirements.txt
  frontend/
    src/
      pages/                 # Upload, Contracts, Calendar
      components/            # PDFViewer (original + OCR/highlights)
      services/api.ts        # API client
      types/                 # TS types aligned with backend
    Dockerfile
  docker-compose.yml
  README.md (this file)
```

## Setup & Running
### Docker (recommended)
Create `.env` in the repo root:
```
OPENROUTER_API_KEY=your_openrouter_key
# Optional SMTP for emailing ICS
# SMTP_HOST=localhost
# SMTP_PORT=25
# SMTP_USER=
# SMTP_PASS=
# SMTP_TLS=false
# SMTP_FROM=no-reply@example.com
```
Run:
```
docker compose up --build
```
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:8000` (OpenAPI docs at `/docs`)

### Local dev (without Docker)
Backend:
```
cd backend
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
export OPENROUTER_API_KEY=your_key_here
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
Install Tesseract if you want OCR locally:
- macOS (brew): `brew install tesseract`
- Ubuntu/Debian: `sudo apt-get install tesseract-ocr`
- Windows: use WSL or install a Tesseract build and ensure it’s on PATH

Frontend:
```
cd frontend
npm install
npm run dev
```
By default the frontend talks to `http://localhost:8000`. You can override via `VITE_API_BASE_URL`.

### Environment Variables
Backend:
- `OPENROUTER_API_KEY` (required)
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_TLS`, `SMTP_FROM` (optional for emailing ICS)
Frontend:
- `VITE_API_BASE_URL` (optional). docker-compose sets this to the backend URL.

## Architecture & Data Flow
```
Upload PDFs → Save file (uploads/) → Extract text (PyMuPDF)
  ↳ If low/empty text → OCR page images with Tesseract
→ AI extraction (OpenRouter/GPT‑4) → Validate/normalize (dates, ints)
→ Persist Contract (SQLite) → Compute notice_deadline
→ Calendar events → ICS export/email → Frontend UI
```

### Backend (FastAPI)
- Concurrency per uploaded file (`asyncio.create_task`) with independent DB sessions
- Consistent JSON error shape for HTTP/validation/errors
- CORS allowed for `http://localhost:5173`
- Storage: PDFs in `uploads/`; DB is `sqlite:///./contracts.db`

### Frontend (React)
- Upload flow with statuses, Contracts table (sortable), Edit dialog (recompute deadline), Calendar views, PDF viewer dialog
- API client wraps endpoints with TypeScript types

## Database & Models
`models.Contract`:
- Identity: `id`
- Files: `file_name`, `pdf_path`, `display_name`, `vendor_name`
- Dates: `start_date`, `end_date`, `renewal_date`, computed `notice_deadline`
- Terms: `renewal_term`, `notice_period_days`
- Extraction: `extraction_status` (pending|success|failed), `extraction_confidence`
- Timestamps: `created_at`, `updated_at`

`compute_notice_deadline()` sets `notice_deadline = renewal_date − notice_period_days` when both exist.

## API Reference
Base URL `http://localhost:8000`

### Contracts
- `POST /contracts` — upload one or more PDFs (multipart field name: `files`).
  - Response: `{ "items": [{ id, file_name, extraction_status }] }`
- `GET /contracts` — list all contracts → `Contract[]`
- `GET /contracts/{id}` — get one → `Contract`
- `PUT /contracts/{id}` — update editable fields (display_name, vendor_name, start_date, end_date, renewal_date, renewal_term, notice_period_days). Recomputes `notice_deadline`.
- `DELETE /contracts/{id}` — deletes the contract and best‑effort deletes the associated file.
- `DELETE /contracts` — clears all contracts, deletes referenced files, then purges remaining files in `uploads/`.

### PDF & OCR
- `GET /contracts/{id}/pdf?download=false` — serve inline PDF (CORS headers set). Use `download=true` to force download.
- `HEAD /contracts/{id}/pdf` — lightweight presence check.
- `GET /contracts/{id}/ocr_text` — returns `{ text }` using the same OCR fallback used during ingestion (useful for image‑only scans in preview).

### Calendar & ICS
- `GET /calendar` — `{ events: CalendarEvent[] }` with kinds: `notice_deadline`, `renewal_date`, `expiration`.
- `GET /calendar.ics?reminder_days=7` — ICS export with optional `VALARM` reminder.
- `POST /calendar/email` — `{ to: string[], reminder_days?: number }` to send the ICS via SMTP.

### Errors
All errors are shaped as:
```
{ "error": { "code": "validation_error|not_found|internal|http_error", "message": "..." } }
```

## Frontend UX
- **Upload**: drag‑and‑drop, shows per-file progress state; after processing, quick links to Contracts/Calendar.
- **Contracts**: sortable columns; edit dialog for fields; delete one or clear all; actions have fixed sizes to prevent layout shift.
- **Calendar**: Month/List views with filter cards; Export dialog supports ICS download or email with optional reminder days.
- **PDF Viewer**: dialog with original PDF and OCR/text overlay (see below).

## PDF Preview & Highlighting
- Two stacked sections:
  1) OCR/Text‑only view with soft background highlights for fields (vendor/date/term/notice). If the PDF has no embedded text layer, we still show OCR text fallback.
  2) Original PDF (no overlay) for pixel‑accurate viewing.
- Date highlights attempt common formats (ISO, “MMM D, YYYY”, “MM/DD/YYYY”, etc.) so the overlay can match typical date renderings.
- Highlight chip colors match overlay colors; only found types are shown.

## Calendar & ICS Export
- Events are all‑day; `notice_deadline` is prioritized.
- ICS includes optional `VALARM` that triggers `reminder_days` before an event (converted to minutes).

## Emailing ICS (SMTP)
- Configure SMTP via environment variables. If `SMTP_TLS=true`, a STARTTLS session is used. If `SMTP_USER`/`SMTP_PASS` are set, the server logs in before sending.
- Sender defaults to `no-reply@example.com` unless `SMTP_FROM` is provided.

## File Storage & Cleanup
- Uploaded PDFs are stored under `uploads/{uuid}_{originalName}`.
- Deleting a single contract removes its file best‑effort.
- Bulk clear removes all contract files and then purges any remaining files in `uploads/` to avoid orphans.

## Testing & Diagnostics
- Explore the API: `http://localhost:8000/docs`
- Quick smoke test:
```
python test_app.py
```
The script checks API health, performs a sample upload (expects `SampleAgreements/BRM_OrderForm_Anthropic.pdf`), lists contracts, and fetches calendar events.

## Troubleshooting
- OpenRouter errors: set `OPENROUTER_API_KEY`, ensure egress is allowed; default model is `openai/gpt-4`.
- No highlights in preview: for dates, multiple formats are attempted; if vendor/term not matching, edit values and reopen.
- OCR missing: ensure Tesseract is installed for local runs (Docker image already has it). Low‑quality scans may still be unreliable.
- CORS/access issues: `VITE_API_BASE_URL` must point to backend; backend CORS allows `http://localhost:5173`.
- Ports busy: adjust ports in `docker-compose.yml`.
- SQLite locked: if running multiple backend processes, move to Postgres.
- Email errors: verify SMTP host/port/TLS/auth.

## Roadmap / Next Steps
- Background jobs for large batch uploads
- Authentication & users
- Notification scheduling (email/Slack) ahead of deadlines
- Upload size limits & content scanning

---

Made with FastAPI, React, and a pragmatic focus on clear UX and dependable extraction.
