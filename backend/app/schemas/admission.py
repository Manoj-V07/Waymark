from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import date

# ----------------- MODULE 1 SCHEMAS -----------------
class LoginRequest(BaseModel):
    email: str = Field(..., example="nodal@coep.ac.in")
    password: str

class InstitutionCreate(BaseModel):
    pid: str = Field(..., example="1-10293847")
    name: str = Field(..., example="College of Engineering Pune")
    address: str = Field(..., example="Wellesely Road, Shivajinagar, Pune")
    state: str = Field(..., example="Maharashtra")
    district: str = Field(..., example="Pune")
    regional_office: str = Field(..., example="WRO")
    institution_type: str = Field(..., example="GOVERNMENT")

class ProgrammeCreate(BaseModel):
    programme_name: str = Field(..., example="Mechanical Engineering")
    level: str = Field(..., example="UG")
    duration_years: int = 4

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
    new_status: str = Field(..., example="WITHDRAWN") # 'ACTIVE', 'TRANSFERRED', 'WITHDRAWN', 'COMPLETED', 'CANCELLED'
    reason: str = Field(..., example="Student opted for another institution during round 3 counselling.")

class IdentityCorrectionRequest(BaseModel):
    corrected_name: Optional[str] = None
    corrected_dob: Optional[date] = None
    corrected_apaar_id: Optional[str] = None
    supporting_document_ref: str
