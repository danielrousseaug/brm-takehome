from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime

class ContractBase(BaseModel):
    display_name: Optional[str] = None
    vendor_name: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    renewal_date: Optional[date] = None
    renewal_term: Optional[str] = None
    notice_period_days: Optional[int] = None

class ContractCreate(ContractBase):
    file_name: str
    pdf_path: str

class ContractUpdate(ContractBase):
    pass

class Contract(ContractBase):
    id: int
    file_name: str
    notice_deadline: Optional[date] = None
    extraction_status: str
    extraction_confidence: Optional[float] = None
    created_at: datetime
    updated_at: datetime
    pdf_path: str
    
    class Config:
        from_attributes = True

class UploadResponse(BaseModel):
    items: list[dict]

class CalendarEvent(BaseModel):
    id: str
    contract_id: int
    date: date
    kind: str  # notice_deadline|renewal_date|expiration
    title: str
    subtitle: str

class CalendarResponse(BaseModel):
    events: list[CalendarEvent]

class ErrorResponse(BaseModel):
    error: dict