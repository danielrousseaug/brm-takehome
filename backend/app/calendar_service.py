"""Calendar event derivation and ICS export utilities."""

from typing import List, Optional
from datetime import datetime
from . import models, schemas

def generate_calendar_events(contracts: List[models.Contract]) -> List[schemas.CalendarEvent]:
    """Generate calendar events from persisted contracts."""
    events = []
    
    for contract in contracts:
        display_name = contract.display_name or contract.file_name
        
        # Notice deadline event
        if contract.notice_deadline:
            events.append(schemas.CalendarEvent(
                id=f"notice_{contract.id}",
                contract_id=contract.id,
                date=contract.notice_deadline,
                kind="notice_deadline",
                title=f"{display_name} — Notice Deadline",
                subtitle="Last day to provide renewal notice"
            ))
        
        # Renewal date event
        if contract.renewal_date:
            events.append(schemas.CalendarEvent(
                id=f"renewal_{contract.id}",
                contract_id=contract.id,
                date=contract.renewal_date,
                kind="renewal_date",
                title=f"{display_name} — Renewal Date",
                subtitle="Contract renewal date"
            ))
        
        # Expiration event (if end_date exists and no renewal_date)
        if contract.end_date and not contract.renewal_date:
            events.append(schemas.CalendarEvent(
                id=f"expiration_{contract.id}",
                contract_id=contract.id,
                date=contract.end_date,
                kind="expiration",
                title=f"{display_name} — Expiration",
                subtitle="Contract expiration date"
            ))
    
    return events

def _alarm_block(trigger_days: Optional[int]) -> List[str]:
    if trigger_days is None or trigger_days <= 0:
        return []
    # Alarm triggers trigger_days before the event (all-day)
    minutes = trigger_days * 24 * 60
    return [
        "BEGIN:VALARM",
        f"TRIGGER:-PT{minutes}M",
        "ACTION:DISPLAY",
        "DESCRIPTION:Reminder",
        "END:VALARM",
    ]

def generate_ics_content(events: List[schemas.CalendarEvent], reminder_days: Optional[int] = None) -> str:
    """Generate ICS calendar content from events with optional reminders"""
    
    # ICS header
    ics_lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//BRM//Renewal Calendar//EN",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        "X-WR-CALNAME:BRM Contract Renewals",
        "X-WR-CALDESC:Contract renewal dates and notice deadlines"
    ]
    
    for event in events:
        # Convert date to datetime for ICS format
        event_date = datetime.strptime(str(event.date), "%Y-%m-%d")
        date_str = event_date.strftime("%Y%m%d")
        
        # Create unique ID
        uid = f"{event.id}@brm-renewal-calendar"
        
        # Event priority based on kind
        priority = "1" if event.kind == "notice_deadline" else "5"
        
        # ICS event
        block = [
            "BEGIN:VEVENT",
            f"UID:{uid}",
            f"DTSTART;VALUE=DATE:{date_str}",
            f"DTEND;VALUE=DATE:{date_str}",
            f"DTSTAMP:{datetime.utcnow().strftime('%Y%m%dT%H%M%SZ')}",
            f"SUMMARY:{event.title}",
            f"DESCRIPTION:{event.subtitle}",
            f"PRIORITY:{priority}",
            "STATUS:CONFIRMED",
            "TRANSP:TRANSPARENT",
        ]
        # Optional alarm
        block.extend(_alarm_block(reminder_days))
        block.append("END:VEVENT")
        ics_lines.extend(block)
    
    # ICS footer
    ics_lines.append("END:VCALENDAR")
    
    return "\r\n".join(ics_lines)