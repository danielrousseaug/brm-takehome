import os
import uuid
from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, Response, Form
from fastapi.responses import FileResponse
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

@app.post("/test-upload")
async def test_upload(files: List[UploadFile] = File(...)):
    return {"message": f"Received {len(files)} files", "files": [f.filename for f in files]}

@app.post("/contracts", response_model=schemas.UploadResponse)
async def upload_contracts(
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db)
):
    print(f"Received {len(files)} files")
    results = []
    
    for file in files:
        print(f"Processing file: {file.filename}, size: {file.size}, content_type: {file.content_type}")
        try:
            # Save uploaded file
            file_id = str(uuid.uuid4())
            file_path = f"uploads/{file_id}_{file.filename}"
            os.makedirs("uploads", exist_ok=True)
            
            content = await file.read()
            with open(file_path, "wb") as f:
                f.write(content)
            
            # Create contract record
            contract = models.Contract(
                file_name=file.filename,
                pdf_path=file_path,
                extraction_status="pending"
            )
            db.add(contract)
            db.commit()
            db.refresh(contract)
            
            # Extract text and process with AI
            try:
                text = extract_text_from_pdf(file_path)
                if not text.strip():
                    contract.extraction_status = "failed"
                    db.commit()
                    results.append({
                        "id": contract.id,
                        "file_name": file.filename,
                        "extraction_status": "failed"
                    })
                    continue
                
                # Extract contract data using AI
                extracted_data = await extract_contract_data(text)
                
                # Update contract with extracted data
                contract.vendor_name = extracted_data.get("vendor_name")
                contract.start_date = extracted_data.get("start_date")
                contract.end_date = extracted_data.get("end_date")
                contract.renewal_date = extracted_data.get("renewal_date")
                contract.renewal_term = extracted_data.get("renewal_term")
                contract.notice_period_days = extracted_data.get("notice_period_days")
                
                # Generate smart display name
                contract.display_name = generate_smart_display_name(
                    vendor_name=contract.vendor_name,
                    original_filename=file.filename,
                    db=db
                )
                
                # Compute notice deadline
                contract.compute_notice_deadline()
                contract.extraction_status = "success"
                contract.extraction_confidence = 1.0
                
                db.commit()
                
                results.append({
                    "id": contract.id,
                    "file_name": file.filename,
                    "extraction_status": "success"
                })
                
            except Exception as e:
                contract.extraction_status = "failed"
                db.commit()
                results.append({
                    "id": contract.id,
                    "file_name": file.filename,
                    "extraction_status": "failed"
                })
                
        except Exception as e:
            results.append({
                "id": None,
                "file_name": file.filename,
                "extraction_status": "failed"
            })
    
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
def get_contract_pdf(contract_id: int, db: Session = Depends(get_db)):
    """Serve the PDF file for a contract"""
    contract = db.query(models.Contract).filter(models.Contract.id == contract_id).first()
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    if not os.path.exists(contract.pdf_path):
        raise HTTPException(status_code=404, detail="PDF file not found")
    
    return FileResponse(
        path=contract.pdf_path,
        media_type="application/pdf",
        filename=f"{contract.display_name or contract.file_name}.pdf",
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, HEAD",
            "Access-Control-Allow-Headers": "*",
        }
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)