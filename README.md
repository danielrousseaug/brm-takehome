# BRM Renewal Calendar

A full-stack web application that ingests Purchase Agreement PDFs and presents a renewal calendar showing upcoming deadlines and renewal dates.

## What it does

The BRM Renewal Calendar helps track contractual obligations by:

1. **PDF Upload**: Upload purchase agreement PDFs through a drag-and-drop interface
2. **AI Extraction**: Uses OpenRouter API (GPT-4) to extract key contract dates and terms
3. **Data Review**: Review and edit extracted contract information through an intuitive interface
4. **Calendar View**: Visualize renewal dates, notice deadlines, and contract expirations in a calendar format

Key features:
- Automatic extraction of start dates, end dates, renewal dates, notice periods
- Computed notice deadlines (renewal date - notice period days)  
- Visual calendar with color-coded events (notice deadlines in red, renewals in blue)
- Editable contract data with real-time deadline recalculation
- Support for multiple PDF formats with text extraction

## Quick Start

### Prerequisites
- Docker and Docker Compose
- OpenRouter API key (should have been provided via email)

### Setup

1. Clone this repository or extract the ZIP file
2. Set up your environment:
   ```bash
   cp .env.example .env
   # Edit .env and add your OPENROUTER_API_KEY
   ```

3. Start the application:
   ```bash
   docker compose up --build
   ```

4. Access the application:
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:8000

### Alternative Local Development Setup

If you prefer to run without Docker:

**Backend:**
```bash
cd backend
pip install -r requirements.txt
export OPENROUTER_API_KEY=your_key_here
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Frontend:**
```bash
cd frontend  
npm install
npm run dev
```

## Usage

1. **Upload PDFs**: Go to the Upload page and drag-and-drop PDF files or click to select
2. **Review Contracts**: Navigate to Contracts page to see extracted data and edit any fields
3. **View Calendar**: Check the Calendar page for a visual timeline of renewal dates and notice deadlines

## Tech Stack & Architecture

### Backend (Python + FastAPI)
- **FastAPI**: Modern, fast web framework with automatic API documentation
- **SQLAlchemy + SQLite**: Database ORM and lightweight database for contract storage
- **PyMuPDF (fitz)**: PDF text extraction library
- **OpenRouter API**: Unified API for calling GPT-4 and other language models
- **Uvicorn**: ASGI server for running the FastAPI application

### Frontend (React + TypeScript)
- **React + TypeScript**: Type-safe component-based UI development
- **Material-UI**: Google's Material Design components for consistent UX
- **FullCalendar**: Professional calendar component with multiple view options
- **React Dropzone**: Drag-and-drop file upload interface
- **Day.js**: Lightweight date manipulation library
- **Vite**: Fast build tool and development server

### Data Flow
```
PDF Upload → Text Extraction (PyMuPDF) → AI Processing (OpenRouter/GPT-4) → 
Data Validation & Normalization → SQLite Storage → Calendar Event Generation → UI Display
```

## Technical Decisions & Tradeoffs

### What I Built
- **Minimal MVP**: Focused on core upload → extract → calendar workflow
- **AI-First Extraction**: Used GPT-4 for robust date and term extraction rather than regex patterns
- **Server-Side Date Logic**: All deadline computations happen in the backend for consistency
- **Material Design**: Chose proven UI components for professional appearance
- **SQLite**: Simple, file-based database suitable for prototype/demo environments

### What I Didn't Build (and Why)
- **No OCR**: Scanned PDFs aren't supported to keep scope manageable; PyMuPDF handles most text-based PDFs
- **No Authentication**: Single-user prototype; would add user management for production
- **No Background Processing**: Upload processing is synchronous; would use Celery/Redis for production scale
- **No PDF Viewer**: Focused on extracted data rather than document preview functionality
- **No Advanced Notifications**: No email/Slack integration; calendar view provides visibility

### Key Engineering Decisions
1. **Strict JSON Prompting**: Used precise system/user prompts to ensure consistent AI output format
2. **Frontend State Management**: Kept simple with React hooks rather than Redux for prototype scope  
3. **Error Handling**: Graceful degradation when PDF text extraction or AI processing fails
4. **Date Validation**: Server-side validation and normalization of date formats from AI responses
5. **Real-time Updates**: Immediate deadline recalculation when users edit renewal dates or notice periods

## Data Model

**Contracts Table:**
- Basic info: `id`, `file_name`, `display_name`, `pdf_path`
- Contract dates: `start_date`, `end_date`, `renewal_date`  
- Terms: `renewal_term`, `notice_period_days`
- Computed: `notice_deadline` (renewal_date - notice_period_days)
- Metadata: `extraction_status`, `extraction_confidence`, timestamps

**Calendar Events:** Generated dynamically from contract data with different event types (notice_deadline, renewal_date, expiration)

## What I Would Build Next

If I had more time, I would prioritize:

### P1 (High Value, Low Effort)
- **ICS Export**: Download calendar events as .ics file for importing into Outlook/Google Calendar
- **Bulk Upload Progress**: Real-time progress bars for multiple file uploads  
- **Enhanced Error Messages**: More specific feedback when PDF processing fails

### P2 (Medium Value, Medium Effort)  
- **Email Notifications**: Automated reminders 30/7 days before notice deadlines
- **Vendor/Party Extraction**: Parse and display contracting parties from PDFs
- **Contract Search/Filtering**: Filter contracts by vendor, date range, or status

### P3 (Lower Priority)
- **OCR Support**: Handle scanned PDFs using Tesseract or cloud OCR services
- **PDF Viewer Integration**: Inline PDF viewing with highlighted extracted clauses
- **Advanced Calendar Features**: Recurring reminders, multi-user calendars, time zones

## Known Limitations

- **PDF Text Quality**: Extraction quality depends on PDF text layer; scanned documents not supported
- **AI Model Accuracy**: GPT-4 may occasionally misinterpret complex legal language or date formats  
- **Single Tenant**: No user authentication or data isolation
- **Limited Error Recovery**: Failed extractions require manual data entry rather than retry mechanisms
- **No Audit Trail**: Changes to contract data aren't versioned or logged

## API Documentation

Once running, visit http://localhost:8000/docs for interactive API documentation generated by FastAPI.

**Key Endpoints:**
- `POST /contracts` - Upload PDF files
- `GET /contracts` - List all contracts  
- `PUT /contracts/{id}` - Update contract data
- `GET /calendar` - Get calendar events

## Testing

The application has been tested with the provided sample PDFs. To test:

1. Start the application with `docker compose up`
2. Upload sample PDFs from the `SampleAgreements/` folder
3. Verify extraction results in the Contracts page
4. Check that events appear correctly in the Calendar page
5. Edit a contract's renewal date/notice period and confirm the calendar updates

## Deployment Considerations

For production deployment:
- Use PostgreSQL instead of SQLite
- Add proper authentication and user management  
- Implement background job processing (Celery + Redis)
- Add comprehensive logging and monitoring
- Set up proper environment variable management
- Configure reverse proxy (nginx) and SSL certificates
- Add rate limiting and file upload size restrictions