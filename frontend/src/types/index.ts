export interface VerificationResult {
  valid: boolean;
  status: string;
  apaar_id?: string;
  masked?: string;
  verified_name?: string;
  verified_dob?: string;
  message?: string;
}

export interface ProgrammeData {
  programme_id: string;
  name: string;
  approved_intake: number;
  enrolled_count: number;
}

export interface ActiveInstitution {
  institution_id: string;
  pid: string;
  name: string;
  state: string;
  programmes: ProgrammeData[];
}

export interface IngestionFlag {
  row_number: number;
  rule_code: string;
  severity: "INFO" | "WARNING" | "CRITICAL";
  violation_message: string;
}

export interface IngestionResponse {
  status: string;
  batch_id?: string;
  total_records: number;
  committed_enrolments?: number;
  valid_records?: number;
  critical_errors?: number;
  flags_count?: number;
  audit_hash?: string;
  flags?: IngestionFlag[];
  message?: string;
}

export interface RegulatoryCaseData {
  case_id: string;
  case_number: string;
  institution_id: string;
  programme_id: string;
  academic_year: string;
  rule_code: string;
  clause_reference: string;
  severity: string;
  violation_summary: string;
  excess_count: number;
  indicative_penalty_inr: number;
  status: "OPEN" | "SHOW_CAUSE_ISSUED" | "RESPONSE_SUBMITTED" | "RESOLVED_EXEMPT" | "PENALTY_CONFIRMED";
  show_cause_notice?: string;
  institution_response?: string;
  supporting_doc_ref?: string;
  officer_decision?: string;
  officer_remarks?: string;
  resolved_by_officer?: string;
  created_at: string;
}

export type TabType = "overview" | "upload" | "validator" | "institutions" | "disputes";
