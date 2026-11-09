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

export interface ComplianceFlag {
  rule_code: string;
  clause: string;
  severity: "INFO" | "WARNING" | "CRITICAL";
  violation_message: string;
  excess_count?: number;
  indicative_penalty_clause?: string;
  recommendation: string;
}

export interface ComplianceEvaluationResult {
  compliant: boolean;
  approved_intake: number;
  within_intake_admitted: number;
  supernumerary_admitted: number;
  total_enrolled: number;
  total_allowed_capacity: number;
  rules_applied: string[];
  flags: ComplianceFlag[];
}

export interface AnomalyMatch {
  rule_code: string;
  severity: string;
  confidence_score: number;
  candidate_a: { student_id: string; name: string; dob: string; roll_no?: string; apaar_masked?: string };
  candidate_b: { student_id: string; name: string; dob: string; roll_no?: string; apaar_masked?: string };
  violation_message: string;
  recommendation: string;
}

export interface AnomalyDetectionResult {
  programme_id: string;
  candidates_analyzed: number;
  anomalies_detected: number;
  matches: AnomalyMatch[];
}

export type UserRole = "AICTE_HQ" | "INSTITUTION_NODAL" | "STUDENT" | "VERIFIER";

export interface UserProfile {
  user_id: string;
  email: string;
  full_name: string;
  role: UserRole;
  institution_id?: string;
  is_active: boolean;
}

export interface AuthState {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
}

export type TabType = 
  | "overview" 
  | "upload" 
  | "compliance" 
  | "anomalies" 
  | "disputes" 
  | "validator" 
  | "institutions" 
  | "repository"
  | "audit_ledger"
  | "student_portal" 
  | "verifier_portal";

export interface AuditChainVerification {
  total_blocks_checked: number;
  is_chain_valid: boolean;
  genesis_hash: string;
  latest_hash: string;
  tampered_blocks: number[];
  message: string;
}

export interface AuditBlock {
  log_id: number;
  timestamp: string;
  actor_id: string;
  actor_role: string;
  action: string;
  resource_type: string;
  resource_id: string;
  details_json: Record<string, unknown> | string | null;
  previous_block_hash: string;
  current_block_hash: string;
}

export interface NationalMacroMetrics {
  reporting_institutions: number;
  total_registered_institutions: number;
  total_approved_intake: number;
  total_enrolled_students: number;
  active_enrolments: number;
  verified_apaar_count: number;
  pending_apaar_count: number;
  alt_id_count: number;
  apaar_saturation_pct: number;
  open_regulatory_cases: number;
  resolved_regulatory_cases: number;
  indicative_penalty_exposure_inr: number;
  national_compliance_rate_pct: number;
}

export interface RegionalHeatMapEntry {
  state: string;
  regional_office: string;
  institutions_count: number;
  approved_intake: number;
  enrolled_count: number;
  intake_utilization_pct: number;
  regulatory_cases_count: number;
  risk_status: "COMPLIANT" | "MODERATE" | "HIGH_FLAG";
}

export interface InstitutionalRiskScore {
  institution_id: string;
  pid: string;
  name: string;
  state: string;
  institution_type: string;
  open_cases_count: number;
  total_cases_count: number;
  risk_score: number;
  risk_tier: "LOW" | "MEDIUM" | "HIGH";
  recommendation: string;
}

export interface StudentLedgerRecord {
  enrolment_id: string;
  student_id: string;
  full_name: string;
  dob: string;
  gender: string;
  identity_status: string;
  apaar_masked: string;
  roll_number: string;
  programme_name: string;
  level: string;
  institution_name: string;
  academic_year: string;
  current_year_of_study: number;
  enrolment_status: "ACTIVE" | "WITHDRAWN" | "TRANSFERRED" | "SUSPENDED" | "COMPLETED" | "PROVISIONAL";
  enrolment_date: string;
}

export interface InstitutionProgrammeDetail {
  programme_id: string;
  name: string;
  level: string;
  duration_years: number;
  is_active: boolean;
  approved_intake: number;
  active_enrolment: number;
  eoa_ref: string;
  seat_caps: Record<string, { seats: number; is_above_intake: boolean }>;
}

export interface InstitutionAuditRecord {
  log_id: number;
  timestamp: string;
  actor_id: string;
  actor_role: string;
  action: string;
  details: Record<string, unknown>;
  block_hash: string;
}

export interface InstitutionDetailResponse {
  institution_id: string;
  pid: string;
  name: string;
  address: string;
  state: string;
  district: string;
  regional_office: string;
  institution_type: string;
  status: "ACTIVE" | "UNDER_REVIEW" | "NO_ADMISSION" | "SUSPENDED" | "WITHDRAWN" | string;
  created_at: string;
  total_approved_intake: number;
  total_active_enrolled: number;
  programmes: InstitutionProgrammeDetail[];
  audit_history: InstitutionAuditRecord[];
}
