export interface Contract {
  id: number;
  file_name: string;
  display_name: string | null;
  vendor_name: string | null;
  start_date: string | null;
  end_date: string | null;
  renewal_date: string | null;
  renewal_term: string | null;
  notice_period_days: number | null;
  notice_deadline: string | null;
  extraction_status: 'pending' | 'success' | 'failed';
  extraction_confidence: number | null;
  created_at: string;
  updated_at: string;
  pdf_path: string;
  // Review/uncertainty metadata
  needs_review?: boolean;
  extraction_notes?: string | null;
  uncertain_fields?: string[] | null;
  candidate_dates?: Record<string, string[]> | null;
}

export interface CalendarEvent {
  id: string;
  contract_id: number;
  date: string;
  kind: 'notice_deadline' | 'renewal_date' | 'expiration';
  title: string;
  subtitle: string;
}

export interface UploadResponse {
  items: Array<{
    id: number;
    file_name: string;
    extraction_status: string;
  }>;
}

export interface ContractUpdate {
  display_name?: string;
  vendor_name?: string;
  start_date?: string;
  end_date?: string;
  renewal_date?: string;
  renewal_term?: string;
  notice_period_days?: number;
  // Review/uncertainty metadata
  needs_review?: boolean;
  extraction_notes?: string | null;
  uncertain_fields?: string[];
  candidate_dates?: Record<string, string[]>;
}