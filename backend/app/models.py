from sqlalchemy import Column, Integer, String, Date, DateTime, Float, Text, Boolean
try:
    # SQLAlchemy JSON works across backends; SQLite stores as TEXT
    from sqlalchemy import JSON
except Exception:  # Fallback if JSON not available
    JSON = Text  # type: ignore
from sqlalchemy.sql import func
from datetime import date, datetime, timedelta
from .database import Base

class Contract(Base):
    __tablename__ = "contracts"
    
    id = Column(Integer, primary_key=True, index=True)
    file_name = Column(String, nullable=False)
    display_name = Column(String, nullable=True)
    vendor_name = Column(String, nullable=True)
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    renewal_date = Column(Date, nullable=True)
    renewal_term = Column(Text, nullable=True)
    notice_period_days = Column(Integer, nullable=True)
    notice_deadline = Column(Date, nullable=True)
    extraction_status = Column(String, default="pending")  # pending|success|failed
    extraction_confidence = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    pdf_path = Column(String, nullable=False)
    
    # Review/uncertainty metadata
    needs_review = Column(Boolean, nullable=False, server_default="0")
    extraction_notes = Column(Text, nullable=True)
    # JSON blobs for UI assistance (keys like start_date/end_date/renewal_date)
    uncertain_fields = Column(JSON, nullable=True)
    candidate_dates = Column(JSON, nullable=True)
    
    def compute_notice_deadline(self):
        """Compute notice_deadline from renewal_date and notice_period_days"""
        if self.renewal_date and self.notice_period_days:
            self.notice_deadline = self.renewal_date - timedelta(days=self.notice_period_days)
        else:
            self.notice_deadline = None