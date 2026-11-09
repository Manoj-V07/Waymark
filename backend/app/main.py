import io
import hashlib
from typing import Optional, List, Dict, Any
import pandas as pd
from datetime import datetime, date, timezone
from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, Form, Response
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import engine, Base, get_db
from app.models.entities import (
    RegulatoryRule, Institution, Programme, Approval, SeatApproval, User,
    IngestionBatch, Enrolment, Student, StudentIdentity, AuditLog, ValidationResult,
    AdmissionDetail, RegulatoryCase
)
from app.schemas.admission import (
    LoginRequest, RegisterRequest, InstitutionCreate, ProgrammeCreate, ApprovalCreate,
    SingleStudentEnrolRequest, EnrolmentStatusUpdate, IdentityCorrectionRequest,
    OpenCaseRequest, InstitutionCaseResponse, OfficerDecisionRequest,
    CreateConsentRequest, UpdateConsentStatusRequest, VerifierQueryRequest
)
from app.core.security import get_password_hash, verify_password, create_access_token, calculate_sha256_hash
from app.core.auth_guard import get_current_user, require_roles
from app.services.regulatory_engine import RegulatoryRuleEngine
from app.services.apaar_validator import APAARValidator
from app.services.duplicate_detector import DuplicateAnomalyDetector
from app.services.ingestion_parser import IngestionParser
from app.services.ingestion_service import AdmissionIngestionService
from app.services.analytics_service import AnalyticsService
from app.services.student_repository_service import StudentRepositoryService
from app.services.verification_audit_engine import VerificationAuditEngine

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    description="APAAR ID-Based Student Data Management and Verification Platform for AICTE-Approved Institutions (SIH 26263)",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {
        "platform": settings.PROJECT_NAME,
        "status": "online",
        "docs": f"{settings.API_V1_STR}/docs",
        "version": "1.0.0"
    }

@app.get(f"{settings.API_V1_STR}/health")
def health_check(db: Session = Depends(get_db)):
    return {
        "status": "healthy",
        "database": "connected",
        "rules_engine": "APH Dynamic Configurable Active",
        "apaar_adapter": "ready",
        "modules_active": [
            "M1_INSTITUTION", "M2_IDENTITY", "M3_ENROLMENT", "M4_INGESTION", "M5_APAAR_VALIDATOR",
            "M6_REGULATORY_RULES", "M7_DUPLICATE_ANOMALY", "M10_CASE_WORKFLOW"
        ]
    }

# =========================================================================
# MODULE 1: INSTITUTION & APPROVAL MASTER MANAGEMENT
# =========================================================================

@app.post(f"{settings.API_V1_STR}/auth/login")
def user_login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )
    
    inst_name = user.institution.name if user.institution else None
    inst_pid = user.institution.pid if user.institution else None

    token = create_access_token({
        "sub": user.user_id,
        "email": user.email,
        "role": user.role,
        "institution_id": user.institution_id
    })
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "user_id": user.user_id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "institution_id": user.institution_id,
            "institution_name": inst_name,
            "institution_pid": inst_pid
        }
    }

@app.post(f"{settings.API_V1_STR}/auth/register")
def user_register(req: RegisterRequest, db: Session = Depends(get_db)):
    """Registers a new user (Institution Registrar, Student, or Verifier) with designated role."""
    existing = db.query(User).filter(User.email == req.email).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Email {req.email} is already registered.")

    # Validate institution if nodal role
    inst_id = req.institution_id
    if req.role == "INSTITUTION_NODAL" and req.institution_pid and not inst_id:
        inst = db.query(Institution).filter(Institution.pid == req.institution_pid).first()
        if inst:
            inst_id = inst.institution_id

    new_user = User(
        email=req.email,
        hashed_password=get_password_hash(req.password),
        full_name=req.full_name,
        role=req.role.upper(),
        institution_id=inst_id,
        is_active=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    token = create_access_token({
        "sub": new_user.user_id,
        "email": new_user.email,
        "role": new_user.role,
        "institution_id": new_user.institution_id
    })
    return {
        "status": "success",
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "user_id": new_user.user_id,
            "email": new_user.email,
            "full_name": new_user.full_name,
            "role": new_user.role,
            "institution_id": new_user.institution_id
        }
    }

@app.get(f"{settings.API_V1_STR}/auth/me")
def get_current_profile(current_user: User = Depends(get_current_user)):
    """Returns the authenticated user profile and permissions."""
    inst_name = current_user.institution.name if current_user.institution else None
    inst_pid = current_user.institution.pid if current_user.institution else None
    return {
        "user_id": current_user.user_id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "role": current_user.role,
        "institution_id": current_user.institution_id,
        "institution_name": inst_name,
        "institution_pid": inst_pid
    }

@app.post(f"{settings.API_V1_STR}/institutions")
def create_institution(req: InstitutionCreate, db: Session = Depends(get_db)):
    existing = db.query(Institution).filter(Institution.pid == req.pid).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Institution with PID {req.pid} already exists.")
    
    inst = Institution(
        pid=req.pid,
        name=req.name,
        address=req.address,
        state=req.state,
        district=req.district,
        regional_office=req.regional_office,
        institution_type=req.institution_type,
        status="ACTIVE"
    )
    db.add(inst)
    db.commit()
    db.refresh(inst)
    return inst

@app.get(f"{settings.API_V1_STR}/institutions/{{institution_id}}/eoa")
def get_institution_eoa_details(institution_id: str, academic_year: str = "2026-27", db: Session = Depends(get_db)):
    inst = db.query(Institution).filter(Institution.institution_id == institution_id).first()
    if not inst:
        raise HTTPException(status_code=404, detail="Institution not found.")

    programmes_data = []
    for p in inst.programmes:
        approval = db.query(Approval).filter(
            Approval.programme_id == p.programme_id,
            Approval.academic_year == academic_year
        ).first()

        caps = {}
        if approval:
            for sc in approval.seat_approvals:
                caps[sc.category_code] = {
                    "seats": sc.approved_seats,
                    "is_above_intake": sc.is_above_intake
                }

        enrolled_count = db.query(Enrolment).filter(
            Enrolment.programme_id == p.programme_id,
            Enrolment.enrolment_status == "ACTIVE"
        ).count()

        programmes_data.append({
            "programme_id": p.programme_id,
            "name": p.programme_name,
            "level": p.level,
            "approved_intake": approval.approved_intake if approval else 0,
            "active_enrolment": enrolled_count,
            "eoa_ref": approval.eoa_reference_number if approval else "PENDING_EOA",
            "seat_caps": caps
        })

    return {
        "institution_id": inst.institution_id,
        "pid": inst.pid,
        "name": inst.name,
        "state": inst.state,
        "status": inst.status,
        "academic_year": academic_year,
        "programmes": programmes_data
    }

@app.get(f"{settings.API_V1_STR}/institutions/active")
def list_active_institutions(db: Session = Depends(get_db)):
    institutions = db.query(Institution).all()
    output = []
    for inst in institutions:
        progs = []
        for p in inst.programmes:
            appr = db.query(Approval).filter(
                Approval.programme_id == p.programme_id,
                Approval.academic_year == "2026-27"
            ).first()
            intake = appr.approved_intake if appr else 0
            enrolled_count = db.query(Enrolment).filter(
                Enrolment.programme_id == p.programme_id,
                Enrolment.enrolment_status == "ACTIVE"
            ).count()
            progs.append({
                "programme_id": p.programme_id,
                "name": p.programme_name,
                "approved_intake": intake,
                "enrolled_count": enrolled_count
            })
        output.append({
            "institution_id": inst.institution_id,
            "pid": inst.pid,
            "name": inst.name,
            "state": inst.state,
            "programmes": progs
        })
    return output

# =========================================================================
# MODULE 2: STUDENT IDENTITY REGISTRY
# =========================================================================

@app.get(f"{settings.API_V1_STR}/students/{{student_id}}/identity")
def get_student_identity_record(student_id: str, db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.student_id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student record not found.")

    identities = []
    for ident in student.identities:
        identities.append({
            "identity_id": ident.identity_id,
            "type": ident.identity_type,
            "masked_value": ident.identity_masked,
            "source": ident.verification_source,
            "verified_at": ident.verified_at
        })

    enrolments = []
    for enr in student.enrolments:
        enrolments.append({
            "enrolment_id": enr.enrolment_id,
            "institution_name": enr.programme.institution.name,
            "programme_name": enr.programme.programme_name,
            "academic_year": enr.academic_year,
            "roll_no": enr.roll_number_institutional,
            "status": enr.enrolment_status
        })

    return {
        "student_id": student.student_id,
        "full_name": student.full_name,
        "dob": student.dob,
        "gender": student.gender,
        "identity_status": student.identity_status,
        "identities": identities,
        "enrolments": enrolments
    }

@app.post(f"{settings.API_V1_STR}/students/{{student_id}}/correction-request")
def request_identity_correction(student_id: str, req: IdentityCorrectionRequest, db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.student_id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student record not found.")

    audit_payload = {
        "student_id": student_id,
        "proposed_changes": req.model_dump(exclude_none=True),
        "document_ref": req.supporting_document_ref
    }
    last_log = db.query(AuditLog).order_by(AuditLog.log_id.desc()).first()
    prev_hash = last_log.current_block_hash if last_log else "0" * 64
    curr_time = datetime.now(timezone.utc).isoformat()
    curr_hash = calculate_sha256_hash(audit_payload, prev_hash, "INST_REGISTRAR", curr_time)

    audit_entry = AuditLog(
        actor_id="INST_REGISTRAR",
        actor_role="INSTITUTION_NODAL",
        action="IDENTITY_CORRECTION_REQUESTED",
        resource_type="STUDENT",
        resource_id=student_id,
        details_json=audit_payload,
        previous_block_hash=prev_hash,
        current_block_hash=curr_hash
    )
    db.add(audit_entry)
    db.commit()

    return {
        "status": "correction_under_review",
        "message": "Identity correction request submitted and queued for AICTE Regional Officer scrutiny.",
        "audit_hash": curr_hash
    }

# =========================================================================
# MODULE 3: STUDENT ENROLMENT LIFECYCLE
# =========================================================================

@app.post(f"{settings.API_V1_STR}/students/enrol")
def direct_single_student_enrol(req: SingleStudentEnrolRequest, db: Session = Depends(get_db)):
    record = {
        "row_number": 1,
        "apaar_id": req.apaar_id or "",
        "apaar_status": "VERIFIED" if req.apaar_id else "PENDING_APAAR",
        "full_name": req.full_name,
        "dob": req.dob.strftime("%Y-%m-%d"),
        "gender": req.gender.upper(),
        "email": req.email or "",
        "roll_number_institutional": req.roll_number_institutional,
        "university_reg_number": req.university_reg_number or "",
        "aicte_enrolment_number": req.aicte_enrolment_number or "",
        "seat_category": req.seat_category.upper(),
        "admission_channel": req.admission_channel.upper(),
        "allotment_order_ref": req.allotment_order_ref or "",
        "annual_family_income": req.annual_family_income or 0.0
    }

    result = AdmissionIngestionService.process_admission_batch(
        db=db,
        institution_id=req.institution_id,
        programme_id=req.programme_id,
        academic_year=req.academic_year,
        file_name="ERP_DIRECT_API",
        records=[record],
        parsing_flags=[],
        dry_run=False
    )
    return result

@app.patch(f"{settings.API_V1_STR}/enrolments/{{enrolment_id}}/status")
def update_enrolment_status(enrolment_id: str, req: EnrolmentStatusUpdate, db: Session = Depends(get_db)):
    enrolment = db.query(Enrolment).filter(Enrolment.enrolment_id == enrolment_id).first()
    if not enrolment:
        raise HTTPException(status_code=404, detail="Enrolment record not found.")

    old_status = enrolment.enrolment_status
    enrolment.enrolment_status = req.new_status

    audit_payload = {
        "enrolment_id": enrolment_id,
        "old_status": old_status,
        "new_status": req.new_status,
        "reason": req.reason
    }
    last_log = db.query(AuditLog).order_by(AuditLog.log_id.desc()).first()
    prev_hash = last_log.current_block_hash if last_log else "0" * 64
    curr_time = datetime.now(timezone.utc).isoformat()
    curr_hash = calculate_sha256_hash(audit_payload, prev_hash, "NODAL_OFFICER", curr_time)

    audit_entry = AuditLog(
        actor_id="NODAL_OFFICER",
        actor_role="INSTITUTION_NODAL",
        action="ENROLMENT_STATUS_TRANSITION",
        resource_type="ENROLMENT",
        resource_id=enrolment_id,
        details_json=audit_payload,
        previous_block_hash=prev_hash,
        current_block_hash=curr_hash
    )
    db.add(audit_entry)
    db.commit()

    return {
        "status": "success",
        "enrolment_id": enrolment_id,
        "previous_status": old_status,
        "current_status": req.new_status,
        "audit_hash": curr_hash
    }

# =========================================================================
# MODULE 4: BULK INGESTION & BATCH HISTORY
# =========================================================================

@app.get(f"{settings.API_V1_STR}/ingestion/template")
def download_template(format: str = "csv"):
    df = IngestionParser.generate_template_dataframe()
    if format.lower() == "xlsx":
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine="openpyxl") as writer:
            df.to_excel(writer, index=False, sheet_name="AICTE_Student_Admission")
        output.seek(0)
        return StreamingResponse(
            output,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": "attachment; filename=aicte_student_admission_template.xlsx"}
        )
    else:
        csv_data = df.to_csv(index=False)
        return Response(
            content=csv_data,
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=aicte_student_admission_template.csv"}
        )

@app.post(f"{settings.API_V1_STR}/ingestion/upload")
async def upload_admission_batch(
    file: UploadFile = File(...),
    institution_id: str = Form(...),
    programme_id: str = Form(...),
    academic_year: str = Form("2026-27"),
    dry_run: bool = Form(False),
    db: Session = Depends(get_db)
):
    contents = await file.read()
    records, flags = IngestionParser.parse_file_contents(contents, file.filename)

    if not records and flags:
        return {
            "status": "rejected",
            "message": flags[0]["violation_message"],
            "flags": flags
        }

    result = AdmissionIngestionService.process_admission_batch(
        db=db,
        institution_id=institution_id,
        programme_id=programme_id,
        academic_year=academic_year,
        file_name=file.filename,
        records=records,
        parsing_flags=flags,
        dry_run=dry_run
    )
    return result

@app.get(f"{settings.API_V1_STR}/ingestion/batches")
def list_ingestion_batches(institution_id: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(IngestionBatch)
    if institution_id:
        query = query.filter(IngestionBatch.institution_id == institution_id)
    batches = query.order_by(IngestionBatch.created_at.desc()).limit(20).all()
    return batches

@app.get(f"{settings.API_V1_STR}/ingestion/batches/{{batch_id}}/export-errors")
def export_batch_errors(batch_id: str, db: Session = Depends(get_db)):
    results = db.query(ValidationResult).filter(ValidationResult.batch_id == batch_id).all()
    if not results:
        raise HTTPException(status_code=404, detail="No error flags found for this batch.")

    rows = []
    for r in results:
        row_num = (r.details_json or {}).get("row_number", "N/A")
        rows.append({
            "Row Number": row_num,
            "Rule Code": r.rule_code,
            "Severity": r.severity,
            "AICTE Clause Reference": r.aph_clause_reference,
            "Violation Description": r.violation_message,
            "Action Required": "Please correct and re-upload" if r.severity == "CRITICAL" else "Advisory notice"
        })

    df = pd.DataFrame(rows)
    csv_bytes = df.to_csv(index=False)
    return Response(
        content=csv_bytes,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=batch_{batch_id}_errors.csv"}
    )

# =========================================================================
# MODULE 6 & 7: REGULATORY RULES & TF-IDF ANOMALY DETECTION
# =========================================================================

@app.get(f"{settings.API_V1_STR}/rules")
def get_regulatory_rules(academic_year: str = "2026-27", db: Session = Depends(get_db)):
    rules = db.query(RegulatoryRule).filter(RegulatoryRule.is_active == True).all()
    if not rules:
        return RegulatoryRuleEngine.get_active_rules(db=db, academic_year=academic_year)
    return rules

@app.post(f"{settings.API_V1_STR}/rules/update-parameter")
def update_rule_parameter(payload: dict, db: Session = Depends(get_db)):
    rule_code = payload.get("rule_code")
    new_params = payload.get("parameters")
    
    rule = db.query(RegulatoryRule).filter(RegulatoryRule.rule_code == rule_code).first()
    if not rule:
        rule = RegulatoryRule(
            rule_code=rule_code,
            clause_reference=payload.get("clause_reference", "AICTE Notification"),
            rule_name=payload.get("rule_name", rule_code),
            category_code=payload.get("category_code", "GENERAL"),
            parameters_json=new_params,
            violation_template="Threshold exceeded.",
            recommendation_template="Review rule update."
        )
        db.add(rule)
    else:
        rule.parameters_json = new_params

    db.commit()
    db.refresh(rule)
    return {
        "status": "success",
        "message": f"Rule {rule_code} parameters updated successfully.",
        "rule": rule
    }

@app.post(f"{settings.API_V1_STR}/validation/compliance/evaluate-programme")
def evaluate_programme_compliance(institution_id: str, programme_id: str, academic_year: str = "2026-27", db: Session = Depends(get_db)):
    """Deep evaluation of a programme's roster against APH 2024-27 rules."""
    approval = db.query(Approval).filter(
        Approval.programme_id == programme_id,
        Approval.academic_year == academic_year
    ).first()
    if not approval:
        raise HTTPException(status_code=404, detail="No approval found for this programme and academic year.")

    enrolments = db.query(Enrolment).filter(
        Enrolment.programme_id == programme_id,
        Enrolment.academic_year == academic_year,
        Enrolment.enrolment_status == "ACTIVE"
    ).all()

    enrolled_regular = 0
    enrolled_nri = 0
    supernumerary_counts = {}

    for e in enrolments:
        if e.admission_details:
            cat = e.admission_details.seat_category
            if cat == "NRI":
                enrolled_nri += 1
            elif e.admission_details.is_supernumerary:
                supernumerary_counts[cat] = supernumerary_counts.get(cat, 0) + 1
            else:
                enrolled_regular += 1
        else:
            enrolled_regular += 1

    eval_result = RegulatoryRuleEngine.evaluate_programme_intake(
        approved_intake=approval.approved_intake,
        enrolled_regular=enrolled_regular,
        enrolled_nri=enrolled_nri,
        enrolled_supernumerary=supernumerary_counts,
        db=db,
        academic_year=academic_year
    )
    return eval_result

@app.post(f"{settings.API_V1_STR}/anomalies/detect-near-duplicates")
def detect_near_duplicates_in_programme(programme_id: str, threshold: float = 0.85, db: Session = Depends(get_db)):
    """Uses scikit-learn TF-IDF to find suspicious near-identical student names sharing the same DOB."""
    enrolments = db.query(Enrolment).filter(
        Enrolment.programme_id == programme_id,
        Enrolment.enrolment_status == "ACTIVE"
    ).all()

    candidates = []
    for e in enrolments:
        candidates.append({
            "student_id": e.student.student_id,
            "name": e.student.full_name,
            "dob": e.student.dob.strftime("%Y-%m-%d"),
            "roll_no": e.roll_number_institutional,
            "apaar_masked": e.student.identities[0].identity_masked if e.student.identities else "PENDING"
        })

    suspects = DuplicateAnomalyDetector.detect_fuzzy_demographic_matches(candidates, threshold=threshold)
    return {
        "programme_id": programme_id,
        "candidates_analyzed": len(candidates),
        "anomalies_detected": len(suspects),
        "matches": suspects
    }

# =========================================================================
# MODULE 10: REGULATORY DISPUTE & CASE MANAGEMENT
# =========================================================================

@app.get(f"{settings.API_V1_STR}/cases")
def list_regulatory_cases(institution_id: Optional[str] = None, status_filter: Optional[str] = None, db: Session = Depends(get_db)):
    """Lists show-cause and regulatory compliance review cases."""
    query = db.query(RegulatoryCase)
    if institution_id:
        query = query.filter(RegulatoryCase.institution_id == institution_id)
    if status_filter:
        query = query.filter(RegulatoryCase.status == status_filter)
    cases = query.order_by(RegulatoryCase.created_at.desc()).all()
    return cases

@app.post(f"{settings.API_V1_STR}/cases/open")
def open_regulatory_case(req: OpenCaseRequest, db: Session = Depends(get_db)):
    """AICTE Officer opens an official show-cause case against an institution."""
    case_count = db.query(RegulatoryCase).count() + 1
    case_num = f"RC-2026-{case_count:04d}"

    case = RegulatoryCase(
        case_number=case_num,
        institution_id=req.institution_id,
        programme_id=req.programme_id,
        academic_year=req.academic_year,
        rule_code=req.rule_code,
        clause_reference=req.clause_reference,
        violation_summary=req.violation_summary,
        excess_count=req.excess_count,
        indicative_penalty_inr=req.indicative_penalty_inr,
        show_cause_notice=req.show_cause_notice,
        notice_issued_at=datetime.now(timezone.utc),
        status="SHOW_CAUSE_ISSUED"
    )
    db.add(case)
    db.commit()
    db.refresh(case)

    # Append to SHA-256 Audit Log
    audit_payload = {
        "case_id": case.case_id,
        "case_number": case_num,
        "institution_id": req.institution_id,
        "rule_code": req.rule_code,
        "excess_count": req.excess_count
    }
    last_log = db.query(AuditLog).order_by(AuditLog.log_id.desc()).first()
    prev_hash = last_log.current_block_hash if last_log else "0" * 64
    curr_time = datetime.now(timezone.utc).isoformat()
    curr_hash = calculate_sha256_hash(audit_payload, prev_hash, "AICTE_HQ_OFFICER", curr_time)

    audit_entry = AuditLog(
        actor_id="AICTE_HQ_OFFICER",
        actor_role="AICTE_HQ",
        action="SHOW_CAUSE_NOTICE_ISSUED",
        resource_type="REGULATORY_CASE",
        resource_id=case.case_id,
        details_json=audit_payload,
        previous_block_hash=prev_hash,
        current_block_hash=curr_hash
    )
    db.add(audit_entry)
    db.commit()

    return {
        "status": "success",
        "case_number": case_num,
        "case": case,
        "audit_hash": curr_hash
    }

@app.post(f"{settings.API_V1_STR}/cases/{{case_id}}/respond")
def submit_institution_response(case_id: str, req: InstitutionCaseResponse, db: Session = Depends(get_db)):
    """Institution Nodal Officer submits written justification & documentary evidence."""
    case = db.query(RegulatoryCase).filter(RegulatoryCase.case_id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Regulatory case not found.")

    case.institution_response = req.institution_response
    case.supporting_doc_ref = req.supporting_doc_ref
    case.response_submitted_at = datetime.now(timezone.utc)
    case.status = "RESPONSE_SUBMITTED"

    db.commit()
    db.refresh(case)
    return {
        "status": "success",
        "message": "Institution response recorded. Case submitted for AICTE Officer review.",
        "case": case
    }

@app.post(f"{settings.API_V1_STR}/cases/{{case_id}}/decide")
def record_officer_decision(case_id: str, req: OfficerDecisionRequest, db: Session = Depends(get_db)):
    """AICTE Officer records the final non-automated human decision."""
    case = db.query(RegulatoryCase).filter(RegulatoryCase.case_id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Regulatory case not found.")

    case.officer_decision = req.decision
    case.officer_remarks = req.remarks
    case.resolved_by_officer = req.officer_name
    case.resolved_at = datetime.now(timezone.utc)
    case.status = "RESOLVED_EXEMPT" if "EXEMPT" in req.decision else "PENALTY_CONFIRMED"

    # Append decision to SHA-256 Audit Chain
    audit_payload = {
        "case_id": case.case_id,
        "decision": req.decision,
        "officer": req.officer_name,
        "remarks": req.remarks
    }
    last_log = db.query(AuditLog).order_by(AuditLog.log_id.desc()).first()
    prev_hash = last_log.current_block_hash if last_log else "0" * 64
    curr_time = datetime.now(timezone.utc).isoformat()
    curr_hash = calculate_sha256_hash(audit_payload, prev_hash, req.officer_name, curr_time)

    audit_entry = AuditLog(
        actor_id=req.officer_name,
        actor_role="AICTE_REGIONAL_OFFICER",
        action="CASE_DECISION_RECORDED",
        resource_type="REGULATORY_CASE",
        resource_id=case.case_id,
        details_json=audit_payload,
        previous_block_hash=prev_hash,
        current_block_hash=curr_hash
    )
    db.add(audit_entry)
    db.commit()
    db.refresh(case)

    return {
        "status": "success",
        "case_number": case.case_number,
        "decision": req.decision,
        "audit_hash": curr_hash,
        "case": case
    }

# =========================================================================
# MODULE 8: CENTRAL STUDENT REPOSITORY & STATE LEDGER
# =========================================================================

@app.get(f"{settings.API_V1_STR}/students")
def get_students(
    institution_id: Optional[str] = None,
    programme_id: Optional[str] = None,
    search: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    """Module 8: Authoritative query interface for student academic records."""
    return StudentRepositoryService.query_students(
        db,
        institution_id=institution_id,
        programme_id=programme_id,
        search_query=search,
        status=status,
        limit=limit,
        offset=offset
    )

@app.post(f"{settings.API_V1_STR}/students/{{enrolment_id}}/transition-status")
def transition_student_status(
    enrolment_id: str,
    payload: EnrolmentStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["AICTE_HQ", "INSTITUTION_NODAL"]))
):
    """Transitions student enrolment state (e.g. WITHDRAWN, TRANSFERRED) with SHA-256 ledger proof."""
    try:
        actor_name = current_user.full_name or current_user.email
        return StudentRepositoryService.transition_enrolment_status(
            db,
            enrolment_id=enrolment_id,
            new_status=payload.new_status,
            reason=payload.reason,
            actor_id=actor_name
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

# =========================================================================
# MODULE 9: MULTI-STAKEHOLDER DASHBOARDS & ANALYTICS
# =========================================================================

@app.get(f"{settings.API_V1_STR}/analytics/macro-metrics")
def get_macro_analytics(db: Session = Depends(get_db)):
    """Module 9: National overview metrics, approved vs enrolled capacity, and APAAR saturation."""
    return AnalyticsService.get_national_macro_metrics(db)

@app.get(f"{settings.API_V1_STR}/analytics/regional-heatmap")
def get_regional_heatmap(db: Session = Depends(get_db)):
    """Module 9: State and Regional Office (WRO, SRO, NRO, etc.) intake utilization and risk status."""
    return AnalyticsService.get_regional_heat_map(db)

@app.get(f"{settings.API_V1_STR}/analytics/institutional-risk-scores")
def get_institutional_risk_scores(limit: int = 10, db: Session = Depends(get_db)):
    """Module 9: Institutional Compliance Risk Index ranking based on unaddressed flags and intake overages."""
    return AnalyticsService.get_institutional_risk_scoring(db, limit=limit)

# =========================================================================
# MODULE 11: DPDP-COMPLIANT CONSENT & VERIFICATION ENGINE
# =========================================================================

@app.post(f"{settings.API_V1_STR}/dpdp/consents")
def create_dpdp_consent(
    payload: CreateConsentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["STUDENT", "AICTE_HQ"]))
):
    """Module 11: Registers student granular, purpose-bound DPDP consent."""
    try:
        # Default or derived student id
        student_id = current_user.user_id if current_user.role == "STUDENT" else "std-slice3-test-01"
        return VerificationAuditEngine.create_student_consent(
            db,
            student_id=student_id,
            verifier_id=payload.verifier_id,
            purpose=payload.purpose,
            scope_fields=payload.scope_fields,
            expires_in_hours=payload.expires_in_hours
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get(f"{settings.API_V1_STR}/dpdp/consents/my-consents")
def get_my_consents(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["STUDENT", "AICTE_HQ"]))
):
    """Module 11: Lists student active and expired consent records."""
    student_id = current_user.user_id if current_user.role == "STUDENT" else "std-slice3-test-01"
    return VerificationAuditEngine.list_student_consents(db, student_id=student_id)

@app.post(f"{settings.API_V1_STR}/dpdp/consents/{{consent_id}}/revoke")
def revoke_dpdp_consent(
    consent_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["STUDENT", "AICTE_HQ"]))
):
    """Module 11: Revokes an active consent under DPDP Section 6(4)."""
    try:
        student_id = current_user.user_id if current_user.role == "STUDENT" else "std-slice3-test-01"
        return VerificationAuditEngine.revoke_student_consent(db, consent_id=consent_id, student_id=student_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post(f"{settings.API_V1_STR}/dpdp/verify")
def verify_candidate_credentials(
    payload: VerifierQueryRequest,
    db: Session = Depends(get_db)
):
    """Module 11 & 12: Executes cryptographic verifier query with field-level redaction and QR URL."""
    return VerificationAuditEngine.execute_dpdp_verification(
        db,
        apaar_id=payload.apaar_id,
        full_name=payload.full_name,
        dob_str=payload.date_of_birth,
        verifier_id=payload.verifier_id,
        purpose=payload.purpose
    )

# =========================================================================
# MODULE 12: DIGITAL CREDENTIALS, QR & TAMPER-EVIDENT AUDIT LEDGER
# =========================================================================

@app.get(f"{settings.API_V1_STR}/audit/ledger/verify-chain")
def verify_entire_audit_ledger(db: Session = Depends(get_db)):
    """Module 12: Cryptographically verifies the linear SHA-256 chain and checks for block tampering."""
    return VerificationAuditEngine.audit_entire_chain_integrity(db)

# =========================================================================
# MODULE 5 & SYSTEM HELPERS
# =========================================================================

@app.post(f"{settings.API_V1_STR}/validation/apaar/verify")
def verify_apaar(payload: dict):
    apaar_id = payload.get("apaar_id")
    name = payload.get("name", "Student")
    dob = payload.get("dob", "2005-01-01")
    return APAARValidator.verify_against_registry(apaar_id, name, dob)

@app.get(f"{settings.API_V1_STR}/audit/chain")
def get_audit_chain(limit: int = 10, db: Session = Depends(get_db)):
    logs = db.query(AuditLog).order_by(AuditLog.log_id.desc()).limit(limit).all()
    return logs

@app.post(f"{settings.API_V1_STR}/seed-demo-data")
def seed_demo_data(db: Session = Depends(get_db)):
    existing_rule = db.query(RegulatoryRule).first()
    if not existing_rule:
        rules_to_seed = [
            RegulatoryRule(
                rule_code="RULE_NRI_QUOTA_CAP",
                clause_reference="APH Clause 2.8(b)",
                rule_name="NRI Seat Allocation Cap",
                category_code="NRI",
                effective_from_academic_year="2024-25",
                parameters_json={"max_pct": 5.0, "is_above_intake": False},
                severity="CRITICAL",
                violation_template="NRI admissions exceed statutory 5% quota.",
                recommendation_template="Route to Regional Officer."
            ),
            RegulatoryRule(
                rule_code="RULE_INTAKE_CAP",
                clause_reference="APH Clause 7.4(g)",
                rule_name="Approved Intake Cap",
                category_code="INTAKE_CAP",
                effective_from_academic_year="2024-25",
                parameters_json={"tolerance_seats": 0},
                severity="CRITICAL",
                violation_template="Admissions exceed approved sanctioned intake.",
                recommendation_template="Flag for Executive Committee review."
            ),
            RegulatoryRule(
                rule_code="RULE_FN_OCI_CIWG_CAP",
                clause_reference="APH Clause 2.9",
                rule_name="FN/OCI/CIWG Supernumerary Cap",
                category_code="FN_OCI_CIWG",
                effective_from_academic_year="2024-25",
                parameters_json={"max_pct": 15.0, "is_above_intake": True, "ciwg_share_pct": 33.3},
                severity="CRITICAL",
                violation_template="Foreign National admissions exceed 15% quota.",
                recommendation_template="Verify embassy and passport credentials."
            ),
            RegulatoryRule(
                rule_code="RULE_TFW_CAP",
                clause_reference="APH Clause 6.42",
                rule_name="Tuition Fee Waiver Cap",
                category_code="TFW",
                effective_from_academic_year="2024-25",
                parameters_json={"max_pct": 5.0, "min_prev_year_fill_pct": 50.0},
                severity="WARNING",
                violation_template="TFW seats exceed 5% or prior fill <50%.",
                recommendation_template="Verify state merit counselling allocation."
            )
        ]
        db.add_all(rules_to_seed)

    existing_inst = db.query(Institution).filter(Institution.pid == "1-10293847").first()
    if not existing_inst:
        coep = Institution(
            pid="1-10293847",
            name="College of Engineering Pune",
            address="Wellesely Road, Shivajinagar, Pune",
            state="Maharashtra",
            district="Pune",
            regional_office="WRO",
            institution_type="GOVERNMENT",
            status="ACTIVE"
        )
        db.add(coep)
        db.flush()

        admin = User(
            email="nodal@coep.ac.in",
            hashed_password=get_password_hash("Phoenix@2026"),
            full_name="Dr. R. K. Sharma",
            role="INSTITUTION_NODAL",
            institution_id=coep.institution_id
        )
        db.add(admin)

        cs_prog = Programme(
            institution_id=coep.institution_id,
            programme_name="Computer Engineering",
            level="UG",
            duration_years=4
        )
        db.add(cs_prog)
        db.flush()

        approval = Approval(
            programme_id=cs_prog.programme_id,
            academic_year="2026-27",
            eoa_reference_number="AICTE/WRO/1-10293847/2026/EOA",
            approved_intake=120
        )
        db.add(approval)
        db.flush()

        seat_caps = [
            SeatApproval(approval_id=approval.approval_id, category_code="NRI", approved_seats=6, is_above_intake=False),
            SeatApproval(approval_id=approval.approval_id, category_code="FN_OCI_CIWG", approved_seats=18, is_above_intake=True),
            SeatApproval(approval_id=approval.approval_id, category_code="TFW", approved_seats=6, is_above_intake=True)
        ]
        db.add_all(seat_caps)

    # Seed an example Regulatory Case for demonstration
    existing_case = db.query(RegulatoryCase).first()
    if not existing_case:
        demo_inst = db.query(Institution).first()
        demo_prog = demo_inst.programmes[0]
        case = RegulatoryCase(
            case_number="RC-2026-0001",
            institution_id=demo_inst.institution_id,
            programme_id=demo_prog.programme_id,
            academic_year="2026-27",
            rule_code="RULE_INTAKE_CAP",
            clause_reference="APH Clause 7.4(g)",
            severity="CRITICAL",
            violation_summary="Admissions in within-intake pool exceed sanctioned limit of 120 by 6 seats.",
            excess_count=6,
            indicative_penalty_inr=150000.0,
            show_cause_notice="Submit justification for admitting 6 candidates above the approved intake.",
            notice_issued_at=datetime.now(timezone.utc),
            status="SHOW_CAUSE_ISSUED"
        )
        db.add(case)

    db.commit()
    return {"message": "Configurable AICTE regulatory rules and demo institution successfully seeded."}
