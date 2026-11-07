import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, Integer, Boolean, ForeignKey, DateTime, Date, Text, Numeric, JSON
)
from sqlalchemy.orm import relationship
from app.core.database import Base

def generate_uuid():
    return str(uuid.uuid4())

class RegulatoryRule(Base):
    __tablename__ = "regulatory_rules"

    rule_id = Column(String(36), primary_key=True, default=generate_uuid)
    rule_code = Column(String(50), unique=True, nullable=False, index=True)
    clause_reference = Column(String(100), nullable=False)
    rule_name = Column(String(150), nullable=False)
    category_code = Column(String(50), nullable=False)
    effective_from_academic_year = Column(String(10), default="2024-25")
    effective_to_academic_year = Column(String(10), nullable=True)
    parameters_json = Column(JSON, nullable=False)
    severity = Column(String(20), default="CRITICAL")
    violation_template = Column(Text, nullable=False)
    recommendation_template = Column(Text, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

class Institution(Base):
    __tablename__ = "institutions"
    
    institution_id = Column(String(36), primary_key=True, default=generate_uuid)
    pid = Column(String(50), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    address = Column(Text, nullable=False)
    state = Column(String(100), nullable=False, index=True)
    district = Column(String(100), nullable=False)
    regional_office = Column(String(100), nullable=False)
    institution_type = Column(String(50), nullable=False)
    status = Column(String(30), nullable=False, default="ACTIVE")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    programmes = relationship("Programme", back_populates="institution")
    users = relationship("User", back_populates="institution")
    cases = relationship("RegulatoryCase", back_populates="institution")

class Programme(Base):
    __tablename__ = "programmes"
    
    programme_id = Column(String(36), primary_key=True, default=generate_uuid)
    institution_id = Column(String(36), ForeignKey("institutions.institution_id"), nullable=False)
    programme_name = Column(String(150), nullable=False)
    level = Column(String(20), nullable=False)
    duration_years = Column(Integer, default=4)
    is_active = Column(Boolean, default=True)

    institution = relationship("Institution", back_populates="programmes")
    approvals = relationship("Approval", back_populates="programme")
    enrolments = relationship("Enrolment", back_populates="programme")
    cases = relationship("RegulatoryCase", back_populates="programme")

class Approval(Base):
    __tablename__ = "approvals"
    
    approval_id = Column(String(36), primary_key=True, default=generate_uuid)
    programme_id = Column(String(36), ForeignKey("programmes.programme_id"), nullable=False)
    academic_year = Column(String(10), nullable=False)
    eoa_reference_number = Column(String(100), nullable=False)
    approved_intake = Column(Integer, nullable=False)
    is_supernumerary_eligible = Column(Boolean, default=True)

    programme = relationship("Programme", back_populates="approvals")
    seat_approvals = relationship("SeatApproval", back_populates="approval")

class SeatApproval(Base):
    __tablename__ = "seat_approvals"
    
    seat_approval_id = Column(String(36), primary_key=True, default=generate_uuid)
    approval_id = Column(String(36), ForeignKey("approvals.approval_id"), nullable=False)
    category_code = Column(String(30), nullable=False)
    approved_seats = Column(Integer, default=0)
    is_above_intake = Column(Boolean, default=True)

    approval = relationship("Approval", back_populates="seat_approvals")

class Student(Base):
    __tablename__ = "students"
    
    student_id = Column(String(36), primary_key=True, default=generate_uuid)
    full_name = Column(String(200), nullable=False)
    dob = Column(Date, nullable=False)
    gender = Column(String(20), nullable=False)
    email = Column(String(150))
    identity_status = Column(String(30), default="PENDING_APAAR")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    identities = relationship("StudentIdentity", back_populates="student")
    enrolments = relationship("Enrolment", back_populates="student")
    consents = relationship("Consent", back_populates="student")

class StudentIdentity(Base):
    __tablename__ = "student_identities"
    
    identity_id = Column(String(36), primary_key=True, default=generate_uuid)
    student_id = Column(String(36), ForeignKey("students.student_id"), nullable=False)
    identity_type = Column(String(30), nullable=False)
    identity_value_encrypted = Column(Text, nullable=False)
    identity_masked = Column(String(20), nullable=False)
    identity_checksum_hash = Column(String(64), nullable=False, unique=True, index=True)
    verification_source = Column(String(50), default="MOCK_ADAPTER")
    verified_at = Column(DateTime)

    student = relationship("Student", back_populates="identities")

class Enrolment(Base):
    __tablename__ = "enrolments"
    
    enrolment_id = Column(String(36), primary_key=True, default=generate_uuid)
    student_id = Column(String(36), ForeignKey("students.student_id"), nullable=False)
    programme_id = Column(String(36), ForeignKey("programmes.programme_id"), nullable=False)
    academic_year = Column(String(10), nullable=False)
    admission_year = Column(Integer, nullable=False)
    current_year_of_study = Column(Integer, default=1)
    roll_number_institutional = Column(String(50), nullable=False)
    university_reg_number = Column(String(100))
    aicte_enrolment_number = Column(String(100))
    enrolment_status = Column(String(30), default="ACTIVE")
    enrolment_date = Column(Date, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    student = relationship("Student", back_populates="enrolments")
    programme = relationship("Programme", back_populates="enrolments")
    admission_details = relationship("AdmissionDetail", back_populates="enrolment", uselist=False)
    validation_results = relationship("ValidationResult", back_populates="enrolment")

class AdmissionDetail(Base):
    __tablename__ = "admission_details"
    
    admission_detail_id = Column(String(36), primary_key=True, default=generate_uuid)
    enrolment_id = Column(String(36), ForeignKey("enrolments.enrolment_id"), nullable=False)
    seat_category = Column(String(30), nullable=False)
    admission_channel = Column(String(50), nullable=False)
    allotment_order_ref = Column(String(100))
    is_supernumerary = Column(Boolean, default=False)
    annual_family_income = Column(Numeric(12, 2))

    enrolment = relationship("Enrolment", back_populates="admission_details")

class IngestionBatch(Base):
    __tablename__ = "ingestion_batches"
    
    batch_id = Column(String(36), primary_key=True, default=generate_uuid)
    institution_id = Column(String(36), ForeignKey("institutions.institution_id"), nullable=False)
    programme_id = Column(String(36), ForeignKey("programmes.programme_id"))
    academic_year = Column(String(10), nullable=False)
    file_name = Column(String(255))
    total_records = Column(Integer, default=0)
    valid_records = Column(Integer, default=0)
    flagged_records = Column(Integer, default=0)
    batch_status = Column(String(30), default="PROCESSING")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    validation_results = relationship("ValidationResult", back_populates="batch")

class ValidationResult(Base):
    __tablename__ = "validation_results"
    
    result_id = Column(String(36), primary_key=True, default=generate_uuid)
    batch_id = Column(String(36), ForeignKey("ingestion_batches.batch_id"), nullable=True)
    enrolment_id = Column(String(36), ForeignKey("enrolments.enrolment_id"), nullable=True)
    rule_code = Column(String(50), nullable=False)
    severity = Column(String(20), nullable=False)
    violation_message = Column(Text, nullable=False)
    aph_clause_reference = Column(String(100), nullable=False)
    details_json = Column(JSON)
    resolution_status = Column(String(30), default="OPEN") # 'OPEN', 'CASE_OPENED', 'RESOLVED'
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    batch = relationship("IngestionBatch", back_populates="validation_results")
    enrolment = relationship("Enrolment", back_populates="validation_results")

# =========================================================================
# MODULE 10: REGULATORY DISPUTE & CASE MANAGEMENT
# =========================================================================
class RegulatoryCase(Base):
    __tablename__ = "regulatory_cases"

    case_id = Column(String(36), primary_key=True, default=generate_uuid)
    case_number = Column(String(50), unique=True, nullable=False, index=True) # e.g. "RC-2026-0042"
    institution_id = Column(String(36), ForeignKey("institutions.institution_id"), nullable=False)
    programme_id = Column(String(36), ForeignKey("programmes.programme_id"), nullable=False)
    academic_year = Column(String(10), nullable=False)
    rule_code = Column(String(50), nullable=False) # e.g. "RULE_INTAKE_CAP"
    clause_reference = Column(String(100), nullable=False)
    severity = Column(String(20), default="CRITICAL") # 'WARNING', 'CRITICAL'
    violation_summary = Column(Text, nullable=False)
    excess_count = Column(Integer, default=0)
    indicative_penalty_inr = Column(Numeric(12, 2), default=0.0) # Calculated per APH 7.3(g)
    
    # Workflow Lifecycle: 'OPEN', 'SHOW_CAUSE_ISSUED', 'RESPONSE_SUBMITTED', 'RESOLVED_EXEMPT', 'PENALTY_CONFIRMED'
    status = Column(String(30), default="OPEN")
    
    show_cause_notice = Column(Text, nullable=True)
    notice_issued_at = Column(DateTime, nullable=True)
    
    institution_response = Column(Text, nullable=True)
    supporting_doc_ref = Column(String(255), nullable=True)
    response_submitted_at = Column(DateTime, nullable=True)
    
    officer_decision = Column(String(50), nullable=True) # 'EXEMPTED_MERIT', 'INTAKE_ADJUSTED', 'PENALTY_CONFIRMED'
    officer_remarks = Column(Text, nullable=True)
    resolved_by_officer = Column(String(50), nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    institution = relationship("Institution", back_populates="cases")
    programme = relationship("Programme", back_populates="cases")

class Consent(Base):
    __tablename__ = "consents"
    
    consent_id = Column(String(36), primary_key=True, default=generate_uuid)
    student_id = Column(String(36), ForeignKey("students.student_id"), nullable=False)
    verifier_id = Column(String(50), nullable=False)
    purpose = Column(String(150), nullable=False)
    scope_fields = Column(JSON, nullable=False)
    status = Column(String(30), default="PENDING")
    granted_at = Column(DateTime)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    student = relationship("Student", back_populates="consents")

class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    log_id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    actor_id = Column(String(50), nullable=False)
    actor_role = Column(String(50), nullable=False)
    action = Column(String(100), nullable=False)
    resource_type = Column(String(50), nullable=False)
    resource_id = Column(String(50), nullable=False)
    details_json = Column(JSON)
    previous_block_hash = Column(String(64), nullable=False)
    current_block_hash = Column(String(64), nullable=False)

class User(Base):
    __tablename__ = "users"
    
    user_id = Column(String(36), primary_key=True, default=generate_uuid)
    institution_id = Column(String(36), ForeignKey("institutions.institution_id"), nullable=True)
    email = Column(String(150), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(100), nullable=False)
    role = Column(String(50), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    institution = relationship("Institution", back_populates="users")
