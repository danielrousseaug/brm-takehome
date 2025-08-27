import fitz  # PyMuPDF
import json
import httpx
import os
import re
from datetime import datetime, date
from typing import Dict, Optional

def extract_text_from_pdf(pdf_path: str) -> str:
    """Extract text from PDF using PyMuPDF"""
    try:
        doc = fitz.open(pdf_path)
        text = ""
        for page_num in range(len(doc)):
            page = doc.load_page(page_num)
            text += page.get_text()
        doc.close()
        return text
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
    """Extract contract data using OpenRouter API"""
    
    system_prompt = "You are a precise legal metadata extractor. Always return STRICT JSON with the requested keys, no prose. If a field is unknown, use null. Dates MUST be ISO YYYY-MM-DD."
    
    user_prompt = f"""Extract these fields from the following purchase agreement text:
- vendor_name (string or null): The vendor/supplier company name. Look for "Seller", "Provider", "Vendor", company names after "Inc.", "Corp.", "LLC", etc. Extract the clean company name without legal suffixes unless they're part of the common name (e.g., "DocuSign" not "DocuSign, Inc.", but keep "Microsoft Corporation" if that's how it appears)
- start_date (ISO YYYY-MM-DD or null): Look for "Effective Date", "Start Date", "Commencement Date"
- end_date (ISO YYYY-MM-DD or null): Look for "End Date", "Expiration Date", "Term End". If not explicitly stated but you have start_date and term length (e.g., "24 months", "2 years"), calculate: start_date + term_length
- renewal_date (ISO YYYY-MM-DD or null): Date when contract renews, often same as end_date if auto-renewal
- renewal_term (string or null): Description of renewal terms (e.g., "No auto-renewal", "Auto-renews annually")
- notice_period_days (integer or null): Days of notice required (e.g., "30 days notice" = 30)
- notice_deadline (ISO YYYY-MM-DD or null): Last date to give notice, if explicitly stated

IMPORTANT: 
- If you see "Term Length" or "Term" with months/years, calculate end_date = start_date + term_length.
- For vendor_name, prioritize the actual company name that provides the service, not the buyer.
- Examples: "OpenAI", "Microsoft", "Salesforce", "DocuSign", "LinkedIn", "Anthropic"

If unknown, use null. Output STRICT JSON with exactly these keys.

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
            return validate_and_normalize_data(extracted_data)
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