"""PDF text extraction with OCR fallback and AI-based metadata extraction."""

import fitz  # PyMuPDF
import io
import json
import httpx
import os
import re
from datetime import datetime, date
from typing import Dict, Optional
from PIL import Image
import pytesseract

def extract_text_from_pdf(pdf_path: str) -> str:
    """Extract text from a PDF.

    Uses PyMuPDF text layer first; if a page has very little/no text,
    attempts per-page OCR via Tesseract.
    """
    try:
        doc = fitz.open(pdf_path)
        page_texts = []
        for page_num in range(len(doc)):
            page = doc.load_page(page_num)
            text = page.get_text() or ""
            # If page text is empty or suspiciously short, attempt OCR
            if len(text.strip()) < 20:
                try:
                    pix = page.get_pixmap(dpi=300)
                    img_bytes = pix.tobytes("png")
                    img = Image.open(io.BytesIO(img_bytes))
                    ocr_text = pytesseract.image_to_string(img, lang="eng", config="--oem 1 --psm 6")
                    if ocr_text and ocr_text.strip():
                        text = ocr_text
                except Exception as ocr_err:
                    print(f"OCR failed on page {page_num + 1}: {ocr_err}")
            page_texts.append(text)
        doc.close()
        return "\n".join(page_texts).strip()
    except Exception as e:
        print(f"Error extracting text from PDF: {e}")
        return ""

def extract_months_from_term(term: str) -> Optional[int]:
    """Extract number of months from term descriptions like '24 months', '2 years', etc."""
    term = term.lower()
    
    # Look for patterns like "24 months", "24 month", "twenty-four months"
    month_match = re.search(r'(\d+)\s*months?', term)
    if month_match:
        return int(month_match.group(1))
    
    # Look for patterns like "2 years", "2 year", "two years"
    year_match = re.search(r'(\d+)\s*years?', term)
    if year_match:
        return int(year_match.group(1)) * 12
    
    # Handle written numbers
    number_words = {
        'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
        'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
        'eleven': 11, 'twelve': 12, 'twenty-four': 24, 'thirty-six': 36
    }
    
    for word, num in number_words.items():
        if f"{word} month" in term:
            return num
        if f"{word} year" in term:
            return num * 12
    
    return None

async def extract_contract_data(text: str) -> Dict:
    """Extract normalized contract metadata using OpenRouter (GPT-4).

    Returns normalized dict with fields and uncertainty metadata for UI review.
    Keys:
      - vendor_name, start_date, end_date, renewal_date, renewal_term, notice_period_days
      - uncertain_fields: list[str] (e.g., ["start_date", "renewal_date"]) when model unsure
      - candidate_dates: { field: [ISO date strings] } for ambiguous fields
      - extraction_notes: brief human-readable note for UI
    """
    
    system_prompt = (
        "You are a precise legal metadata extractor. Always return STRICT JSON only. "
        "If a field is unknown, use null. Dates MUST be ISO YYYY-MM-DD. "
        "If you are unsure or find conflicting values, populate 'uncertain_fields' with the field names, "
        "and include up to 3 options per such field in 'candidate_dates' using ISO YYYY-MM-DD strings. "
        "Add a short 'extraction_notes' explaining uncertainty in <120 chars."
    )
    
    user_prompt = f"""Extract these fields from the following purchase agreement text:
- vendor_name (string or null): The vendor/supplier company name. Look for "Seller", "Provider", "Vendor", company names after "Inc.", "Corp.", "LLC", etc. Extract the clean company name without legal suffixes unless they're part of the common name (e.g., "DocuSign" not "DocuSign, Inc.", but keep "Microsoft Corporation" if that's how it appears)
- start_date (ISO YYYY-MM-DD or null): Look for "Effective Date", "Start Date", "Commencement Date"
- end_date (ISO YYYY-MM-DD or null): Look for "End Date", "Expiration Date", "Term End". If not explicitly stated but you have start_date and term length (e.g., "24 months", "2 years"), calculate: start_date + term_length
- renewal_date (ISO YYYY-MM-DD or null): Date when contract renews, often same as end_date if auto-renewal
- renewal_term (string or null): Description of renewal terms (e.g., "No auto-renewal", "Auto-renews annually")
- notice_period_days (integer or null): Days of notice required (e.g., "30 days notice" = 30)
- notice_deadline (ISO YYYY-MM-DD or null): Last date to give notice, if explicitly stated

Additionally return uncertainty metadata:
- uncertain_fields (array of strings) — any of: ["start_date","end_date","renewal_date"] when conflicting/unsure
- candidate_dates (object) — for each uncertain field, a list of up to 3 ISO dates
- extraction_notes (string or null) — short note about ambiguity

IMPORTANT: 
- If you see "Term Length" or "Term" with months/years, calculate end_date = start_date + term_length.
- For vendor_name, prioritize the actual company name that provides the service, not the buyer.
- Examples: "OpenAI", "Microsoft", "Salesforce", "DocuSign", "LinkedIn", "Anthropic"

If unknown, use null. Output STRICT JSON with exactly these keys and no extras.

TEXT:
{text}"""

    try:
        api_key = os.getenv("OPENROUTER_API_KEY")
        if not api_key:
            raise ValueError("OPENROUTER_API_KEY not found in environment")
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "openai/gpt-4",
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ],
                    "max_tokens": 500,
                    "temperature": 0
                },
                timeout=30.0
            )
        
        if response.status_code != 200:
            print(f"OpenRouter API error: {response.status_code} - {response.text}")
            return {}
        
        result = response.json()
        content = result["choices"][0]["message"]["content"].strip()
        
        # Parse and validate JSON
        try:
            extracted_data = json.loads(content)
            normalized = validate_and_normalize_data(extracted_data)
            # attach uncertainty metadata (pass-through then normalize shapes)
            meta = {
                "uncertain_fields": extracted_data.get("uncertain_fields") or [],
                "candidate_dates": extracted_data.get("candidate_dates") or {},
                "extraction_notes": extracted_data.get("extraction_notes") or None,
            }
            # keep only known date fields and ISO strings; normalize to lists
            allowed_fields = {"start_date", "end_date", "renewal_date"}
            cleaned_candidates: Dict[str, list] = {}
            for k, v in (meta["candidate_dates"] or {}).items():
                if k in allowed_fields and isinstance(v, list):
                    # filter to valid iso dates we can parse; then reformat to ISO
                    out: list[str] = []
                    for s in v:
                        try:
                            d = datetime.fromisoformat(str(s)).date()
                            out.append(d.isoformat())
                        except Exception:
                            continue
                    if out:
                        cleaned_candidates[k] = out[:3]
            normalized["uncertain_fields"] = [f for f in (meta["uncertain_fields"] or []) if f in allowed_fields]
            normalized["candidate_dates"] = cleaned_candidates
            normalized["extraction_notes"] = meta["extraction_notes"]
            # needs_review if any uncertainty or missing core date fields
            needs_review = bool(normalized.get("uncertain_fields"))
            normalized["needs_review"] = needs_review
            return normalized
        except json.JSONDecodeError as e:
            print(f"Failed to parse JSON response: {e}")
            print(f"Raw response: {content}")
            return {}
            
    except Exception as e:
        print(f"Error calling OpenRouter API: {e}")
        return {}

def validate_and_normalize_data(data: Dict) -> Dict:
    """Validate and normalize extracted data"""
    normalized = {}
    
    # Validate and convert dates
    date_fields = ["start_date", "end_date", "renewal_date", "notice_deadline"]
    for field in date_fields:
        if field in data and data[field]:
            try:
                # Parse ISO date
                parsed_date = datetime.fromisoformat(str(data[field])).date()
                normalized[field] = parsed_date
            except (ValueError, TypeError):
                normalized[field] = None
        else:
            normalized[field] = None
    
    # Calculate end_date if missing but we have start_date and can infer term length
    if not normalized.get("end_date") and normalized.get("start_date"):
        # Try to calculate from renewal_term or extract from original data
        months = None
        renewal_term = data.get("renewal_term", "")
        if renewal_term and isinstance(renewal_term, str):
            months = extract_months_from_term(renewal_term)
        
        # If no months found, look for a "term_length" or similar field in the original data
        if not months:
            for key, value in data.items():
                if isinstance(value, str) and any(term_word in key.lower() for term_word in ['term', 'length', 'duration']):
                    months = extract_months_from_term(value)
                    if months:
                        break
        
        if months:
            try:
                from dateutil.relativedelta import relativedelta
                end_date = normalized["start_date"] + relativedelta(months=months)
                normalized["end_date"] = end_date
            except ImportError:
                # Fallback without dateutil
                import calendar
                year = normalized["start_date"].year
                month = normalized["start_date"].month + months
                while month > 12:
                    year += 1
                    month -= 12
                day = min(normalized["start_date"].day, calendar.monthrange(year, month)[1])
                normalized["end_date"] = date(year, month, day)
            except Exception:
                pass  # Keep end_date as None if calculation fails
    
    # Validate notice_period_days
    if "notice_period_days" in data and data["notice_period_days"]:
        try:
            # Try to parse as integer
            normalized["notice_period_days"] = int(data["notice_period_days"])
        except (ValueError, TypeError):
            # Try to extract number from text like "60 days" or "sixty (60) days"
            text_value = str(data["notice_period_days"])
            match = re.search(r'\((\d+)\)', text_value)  # Extract number in parentheses
            if match:
                normalized["notice_period_days"] = int(match.group(1))
            else:
                match = re.search(r'(\d+)', text_value)  # Extract first number
                if match:
                    normalized["notice_period_days"] = int(match.group(1))
                else:
                    normalized["notice_period_days"] = None
    else:
        normalized["notice_period_days"] = None
    
    # Pass through string fields
    string_fields = ["renewal_term", "vendor_name"]
    for field in string_fields:
        if field in data and data[field]:
            normalized[field] = str(data[field]).strip()
        else:
            normalized[field] = None
    
    return normalized