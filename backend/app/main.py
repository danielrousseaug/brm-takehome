import os
import asyncio
import uuid
from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, Response, Form
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List
from datetime import date, datetime

from . import models, schemas
from .database import SessionLocal, engine, get_db
from .pdf_extractor import extract_text_from_pdf, extract_contract_data
from .calendar_service import generate_calendar_events, generate_ics_content

def generate_smart_display_name(vendor_name: str, original_filename: str, db: Session) -> str:
    """Generate a smart display name for contracts"""
    
    # If vendor name extracted, use it; otherwise use original filename without extension
    if vendor_name:
        return vendor_name.strip()
    else:
        return original_filename.rsplit('.', 1)[0]

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="BRM Renewal Calendar API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Standardized error responses
@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request, exc: StarletteHTTPException):
    if exc.status_code == 404:
        code = "not_found"
    elif exc.status_code == 400:
        code = "bad_request"
    elif exc.status_code == 401:
        code = "unauthorized"
    elif exc.status_code == 403:
        code = "forbidden"
    else:
        code = "http_error"
    return JSONResponse(
        content={"error": {"code": code, "message": exc.detail}},
        status_code=exc.status_code,
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc: RequestValidationError):
    return JSONResponse(
        content={"error": {"code": "validation_error", "message": str(exc)}},
        status_code=422,
    )

@app.exception_handler(Exception)
async def generic_exception_handler(request, exc: Exception):
    return JSONResponse(
        content={"error": {"code": "internal", "message": "Internal server error"}},
        status_code=500,
    )

@app.post("/test-upload")
async def test_upload(files: List[UploadFile] = File(...)):
    return {"message": f"Received {len(files)} files", "files": [f.filename for f in files]}

async def _process_single_file(file: UploadFile) -> dict:
    """Process one uploaded file concurrently: save -> extract -> AI -> persist"""
    def _write_file_bytes(path: str, data: bytes) -> None:
        with open(path, "wb") as f:
            f.write(data)
    # Generate file path and save
    file_id = str(uuid.uuid4())
    file_path = f"uploads/{file_id}_{file.filename}"
    await asyncio.to_thread(os.makedirs, "uploads", 0o777, True)
    content = await file.read()
    await asyncio.to_thread(_write_file_bytes, file_path, content)

    # Use independent DB session per task
    local_db = SessionLocal()
    try:
        # Create pending record
        contract = models.Contract(
            file_name=file.filename,
            pdf_path=file_path,
            extraction_status="pending"
        )
        local_db.add(contract)
        local_db.commit()
        local_db.refresh(contract)

        # Extract text (off the event loop)
        text = await asyncio.to_thread(extract_text_from_pdf, file_path)
        if not text or not text.strip():
            contract.extraction_status = "failed"
            local_db.commit()
            return {"id": contract.id, "file_name": file.filename, "extraction_status": "failed"}

        # Call AI
        extracted_data = await extract_contract_data(text)
        if not extracted_data:
            contract.extraction_status = "failed"
            local_db.commit()
            return {"id": contract.id, "file_name": file.filename, "extraction_status": "failed"}

        # Update fields
        contract.vendor_name = extracted_data.get("vendor_name")
        contract.start_date = extracted_data.get("start_date")
        contract.end_date = extracted_data.get("end_date")
        contract.renewal_date = extracted_data.get("renewal_date")
        contract.renewal_term = extracted_data.get("renewal_term")
        contract.notice_period_days = extracted_data.get("notice_period_days")

        # Display name
        contract.display_name = generate_smart_display_name(
            vendor_name=contract.vendor_name,
            original_filename=file.filename,
            db=local_db
        )

        # Compute deadline
        contract.compute_notice_deadline()
        contract.extraction_status = "success"
        contract.extraction_confidence = 1.0
        local_db.commit()

        return {"id": contract.id, "file_name": file.filename, "extraction_status": "success"}
    except Exception:
        try:
            # Best-effort failure update when we have a contract
            if 'contract' in locals():
                contract.extraction_status = "failed"
                local_db.commit()
        except Exception:
            pass
        return {"id": locals().get('contract').id if 'contract' in locals() else None, "file_name": file.filename, "extraction_status": "failed"}
    finally:
        local_db.close()

@app.post("/contracts", response_model=schemas.UploadResponse)
async def upload_contracts(
    files: List[UploadFile] = File(...),
):
    print(f"Received {len(files)} files for concurrent processing")
    tasks = [asyncio.create_task(_process_single_file(file)) for file in files]
    results = await asyncio.gather(*tasks, return_exceptions=False)
    return {"items": results}

@app.get("/contracts", response_model=List[schemas.Contract])
def get_contracts(db: Session = Depends(get_db)):
    return db.query(models.Contract).all()

@app.get("/contracts/{contract_id}", response_model=schemas.Contract)
def get_contract(contract_id: int, db: Session = Depends(get_db)):
    contract = db.query(models.Contract).filter(models.Contract.id == contract_id).first()
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    return contract

@app.put("/contracts/{contract_id}", response_model=schemas.Contract)
def update_contract(
    contract_id: int,
    contract_update: schemas.ContractUpdate,
    db: Session = Depends(get_db)
):
    contract = db.query(models.Contract).filter(models.Contract.id == contract_id).first()
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    # Update fields
    update_data = contract_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(contract, field, value)
    
    # Recompute notice deadline
    contract.compute_notice_deadline()
    
    db.commit()
    db.refresh(contract)
    return contract

@app.get("/calendar", response_model=schemas.CalendarResponse)
def get_calendar(db: Session = Depends(get_db)):
    contracts = db.query(models.Contract).all()
    events = generate_calendar_events(contracts)
    return {"events": events}

@app.delete("/contracts/{contract_id}")
def delete_contract(contract_id: int, db: Session = Depends(get_db)):
    contract = db.query(models.Contract).filter(models.Contract.id == contract_id).first()
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    # Delete the PDF file if it exists
    try:
        os.remove(contract.pdf_path)
    except:
        pass  # File might not exist or be inaccessible
    
    db.delete(contract)
    db.commit()
    return {"message": "Contract deleted successfully"}

@app.delete("/contracts")
def clear_all_contracts(db: Session = Depends(get_db)):
    contracts = db.query(models.Contract).all()
    
    # Delete all PDF files
    for contract in contracts:
        try:
            os.remove(contract.pdf_path)
        except:
            pass  # File might not exist or be inaccessible
    
    # Delete all contracts from database
    db.query(models.Contract).delete()
    db.commit()
    return {"message": f"Cleared {len(contracts)} contracts"}

@app.get("/calendar.ics")
def export_calendar_ics(db: Session = Depends(get_db)):
    """Export calendar events as ICS file for import into calendar applications"""
    contracts = db.query(models.Contract).all()
    events = generate_calendar_events(contracts)
    
    # Generate ICS content
    ics_content = generate_ics_content(events)
    
    return Response(
        content=ics_content,
        media_type="text/calendar",
        headers={
            "Content-Disposition": "attachment; filename=brm-renewal-calendar.ics"
        }
    )

@app.get("/contracts/{contract_id}/pdf")
@app.head("/contracts/{contract_id}/pdf")
def get_contract_pdf(contract_id: int, download: bool = False, db: Session = Depends(get_db)):
    """Serve the PDF file for a contract"""
    contract = db.query(models.Contract).filter(models.Contract.id == contract_id).first()
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    if not os.path.exists(contract.pdf_path):
        raise HTTPException(status_code=404, detail="PDF file not found")
    
    # Decide inline vs attachment
    disposition = "attachment" if download else "inline"
    filename = f"{contract.display_name or contract.file_name}.pdf"
    headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, HEAD",
        "Access-Control-Allow-Headers": "*",
        "Content-Disposition": f"{disposition}; filename=\"{filename}\"",
    }
    return FileResponse(
        path=contract.pdf_path,
        media_type="application/pdf",
        headers=headers,
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)