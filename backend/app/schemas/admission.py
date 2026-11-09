from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import date

# ----------------- AUTHENTICATION & RBAC SCHEMAS -----------------
class LoginRequest(BaseModel):
    email: str = Field(..., example="nodal@coep.ac.in")
    password: str

class RegisterRequest(BaseModel):
    email: str = Field(..., example="registrar@vjti.ac.in")
    password: str = Field(..., example="SecurePassword@2026")
    full_name: str = Field(..., example="Dr. Ananya Deshmukh")
    role: str = Field(..., example="INSTITUTION_NODAL") # 'AICTE_HQ', 'INSTITUTION_NODAL', 'STUDENT', 'VERIFIER'
    institution_id: Optional[str] = None
    institution_pid: Optional[str] = None

class UserResponse(BaseModel):
    user_id: str
    email: str
    full_name: str
    role: str
    institution_id: Optional[str] = None
    institution_name: Optional[str] = None
    institution_pid: Optional[str] = None

# ----------------- MODULE 1 SCHEMAS -----------------
class InstitutionCreate(BaseModel):
    pid: str = Field(..., example="1-10293847")
    name: str = Field(..., example="College of Engineering Pune")
    address: str = Field(..., example="Wellesely Road, Shivajinagar, Pune")
    state: str = Field(..., example="Maharashtra")
    district: str = Field(..., example="Pune")
    regional_office: str = Field(..., example="WRO")
    institution_type: str = Field(..., example="GOVERNMENT")

class InstitutionUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    state: Optional[str] = None
    district: Optional[str] = None
    regional_office: Optional[str] = None
    institution_type: Optional[str] = None
    amendment_reason: str = Field(..., example="Statutory affiliation name change approved by AICTE Council.")

class InstitutionStatusUpdate(BaseModel):
    status: str = Field(..., example="UNDER_REVIEW") # 'ACTIVE', 'UNDER_REVIEW', 'NO_ADMISSION', 'SUSPENDED', 'WITHDRAWN'
    reason: str = Field(..., example="Regulatory audit identified pending affiliation documentation under APH Clause 7.3(c).")

class ProgrammeCreate(BaseModel):
    programme_name: str = Field(..., example="Mechanical Engineering")
    level: str = Field(..., example="UG")
    duration_years: int = 4
    approved_intake: Optional[int] = 60
    academic_year: Optional[str] = "2026-27"
    seat_caps: Optional[Dict[str, int]] = Field(default={"NRI": 3, "FN_OCI_CIWG": 9, "TFW": 3})

class ProgrammeIntakeUpdate(BaseModel):
    academic_year: str = Field(default="2026-27", example="2026-27")
    approved_intake: int = Field(..., example=120)
    seat_caps: Optional[Dict[str, int]] = Field(default={"NRI": 6, "FN_OCI_CIWG": 18, "TFW": 6})
    reason: str = Field(..., example="Council sanctioned intake enhancement under APH Chapter II.")

class ApprovalCreate(BaseModel):
    academic_year: str = Field(..., example="2026-27")
    eoa_reference_number: str = Field(..., example="AICTE/WRO/1-10293847/2026/EOA")
    approved_intake: int = Field(..., example=60)
    seat_caps: Optional[Dict[str, int]] = Field(default={"NRI": 3, "FN_OCI_CIWG": 9, "TFW": 3})

# ----------------- MODULE 2 & 3 SCHEMAS -----------------
class SingleStudentEnrolRequest(BaseModel):
    institution_id: str
    programme_id: str
    academic_year: str = "2026-27"
    apaar_id: Optional[str] = None
    full_name: str
    dob: date
    gender: str
    email: Optional[str] = None
    roll_number_institutional: str
    university_reg_number: Optional[str] = None
    aicte_enrolment_number: Optional[str] = None
    seat_category: str = "REGULAR_MERIT"
    admission_channel: str = "CENTRAL_COUNSELLING"
    allotment_order_ref: Optional[str] = None
    annual_family_income: Optional[float] = 0.0

class EnrolmentStatusUpdate(BaseModel):
    new_status: str = Field(..., example="WITHDRAWN")
    reason: str = Field(..., example="Student opted for another institution during round 3 counselling.")

class IdentityCorrectionRequest(BaseModel):
    corrected_name: Optional[str] = None
    corrected_dob: Optional[date] = None
    corrected_apaar_id: Optional[str] = None
    supporting_document_ref: str

# ----------------- MODULE 10: DISPUTE & CASE SCHEMAS -----------------
class OpenCaseRequest(BaseModel):
    institution_id: str
    programme_id: str
    academic_year: str = "2026-27"
    rule_code: str
    clause_reference: str
    violation_summary: str
    excess_count: int = 0
    indicative_penalty_inr: float = 0.0
    show_cause_notice: str

class InstitutionCaseResponse(BaseModel):
    institution_response: str
    supporting_doc_ref: str

class OfficerDecisionRequest(BaseModel):
    decision: str = Field(..., example="EXEMPTED_MERIT")
    remarks: str
    officer_name: str = "Regional Review Officer"

# ----------------- MODULE 11 & 12: DPDP CONSENT & VERIFICATION SCHEMAS -----------------
class CreateConsentRequest(BaseModel):
    verifier_id: str = Field(..., example="hr@tcs.com")
    purpose: str = Field(..., example="PRE_EMPLOYMENT_BACKGROUND_CHECK")
    scope_fields: List[str] = Field(default=["full_name", "institution", "programme", "enrolment_status", "credits_earned"])
    expires_in_hours: int = 48

class UpdateConsentStatusRequest(BaseModel):
    status: str = Field(..., example="REVOKED") # 'GRANTED', 'REVOKED'

class VerifierQueryRequest(BaseModel):
    apaar_id: str = Field(..., example="9021-4412-8873")
    full_name: str = Field(..., example="Aarav Sharma")
    date_of_birth: str = Field(..., example="2005-04-12")
    verifier_id: str = Field(..., example="hr@tcs.com")
    purpose: str = Field(..., example="PRE_EMPLOYMENT_BACKGROUND_CHECK")

class AuditLedgerVerificationResult(BaseModel):
    total_blocks_checked: int
    is_chain_valid: boolean if False else bool
    genesis_hash: str
    latest_hash: str
    tampered_blocks: List[int]
    message: str
