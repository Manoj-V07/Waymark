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
    AdmissionDetail
)
from app.schemas.admission import (
    LoginRequest, InstitutionCreate, ProgrammeCreate, ApprovalCreate,
    SingleStudentEnrolRequest, EnrolmentStatusUpdate, IdentityCorrectionRequest
)
from app.core.security import get_password_hash, verify_password, create_access_token, calculate_sha256_hash
from app.services.regulatory_engine import RegulatoryRuleEngine
from app.services.apaar_validator import APAARValidator
from app.services.ingestion_parser import IngestionParser
from app.services.ingestion_service import AdmissionIngestionService

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
        "modules_active": ["M1_INSTITUTION", "M2_IDENTITY", "M3_ENROLMENT", "M4_INGESTION", "M5_APAAR_VALIDATOR"]
    }

# =========================================================================
# MODULE 1: INSTITUTION & APPROVAL MASTER MANAGEMENT
# =========================================================================

@app.post(f"{settings.API_V1_STR}/auth/login")
def user_login(req: LoginRequest, db: Session = Depends(get_db)):
    """Authenticates AICTE Officers, Institutional Nodal Officers, Students, and Verifiers."""
    user = db.query(User).filter(User.email == req.email).first()
    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )
    
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
            "institution_id": user.institution_id
        }
    }

@app.post(f"{settings.API_V1_STR}/institutions")
def create_institution(req: InstitutionCreate, db: Session = Depends(get_db)):
    """Registers an AICTE-approved institution with permanent ID (PID)."""
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
    """Retrieves authoritative EoA approvals, course breakdown, and seat quotas."""
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
# MODULE 2: STUDENT IDENTITY REGISTRY (APAAR & FALLBACK)
# =========================================================================

@app.get(f"{settings.API_V1_STR}/students/{{student_id}}/identity")
def get_student_identity_record(student_id: str, db: Session = Depends(get_db)):
    """Retrieves protected student academic identity details."""
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
    """Submits an identity correction request with supporting document reference."""
    student = db.query(Student).filter(Student.student_id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student record not found.")

    # Record in audit log
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
# MODULE 3: STUDENT ENROLMENT LIFECYCLE MANAGEMENT
# =========================================================================

@app.post(f"{settings.API_V1_STR}/students/enrol")
def direct_single_student_enrol(req: SingleStudentEnrolRequest, db: Session = Depends(get_db)):
    """Direct REST endpoint for college ERPs to register individual students upon admission."""
    # Convert single student into list and process through AdmissionIngestionService
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
    """Transitions student enrolment state (ACTIVE -> WITHDRAWN / TRANSFERRED / COMPLETED)."""
    enrolment = db.query(Enrolment).filter(Enrolment.enrolment_id == enrolment_id).first()
    if not enrolment:
        raise HTTPException(status_code=404, detail="Enrolment record not found.")

    old_status = enrolment.enrolment_status
    enrolment.enrolment_status = req.new_status

    # Record in audit chain
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
    """Lists historical admission upload batches and summary metrics."""
    query = db.query(IngestionBatch)
    if institution_id:
        query = query.filter(IngestionBatch.institution_id == institution_id)
    batches = query.order_by(IngestionBatch.created_at.desc()).limit(20).all()
    return batches

@app.get(f"{settings.API_V1_STR}/ingestion/batches/{{batch_id}}/export-errors")
def export_batch_errors(batch_id: str, db: Session = Depends(get_db)):
    """Exports flagged/invalid records of a batch as a downloadable error spreadsheet."""
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
# MODULE 5: APAAR VALIDATION ENGINE & REGULATORY RULES
# =========================================================================

@app.post(f"{settings.API_V1_STR}/validation/apaar/verify")
def verify_apaar(payload: dict):
    apaar_id = payload.get("apaar_id")
    name = payload.get("name", "Student")
    dob = payload.get("dob", "2005-01-01")
    return APAARValidator.verify_against_registry(apaar_id, name, dob)

@app.post(f"{settings.API_V1_STR}/validation/compliance/evaluate")
def evaluate_compliance(payload: dict, db: Session = Depends(get_db)):
    approved_intake = payload.get("approved_intake", 120)
    enrolled_regular = payload.get("enrolled_regular", 120)
    enrolled_nri = payload.get("enrolled_nri", 0)
    enrolled_supernumerary = payload.get("enrolled_supernumerary", {})
    academic_year = payload.get("academic_year", "2026-27")
    
    return RegulatoryRuleEngine.evaluate_programme_intake(
        approved_intake=approved_intake,
        enrolled_regular=enrolled_regular,
        enrolled_nri=enrolled_nri,
        enrolled_supernumerary=enrolled_supernumerary,
        db=db,
        academic_year=academic_year
    )

@app.get(f"{settings.API_V1_STR}/audit/chain")
def get_audit_chain(limit: int = 10, db: Session = Depends(get_db)):
    logs = db.query(AuditLog).order_by(AuditLog.log_id.desc()).limit(limit).all()
    return logs

@app.post(f"{settings.API_V1_STR}/seed-demo-data")
def seed_demo_data(db: Session = Depends(get_db)):
    """Populates realistic demo institutions and configurable regulatory rules."""
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

    db.commit()
    return {"message": "Configurable AICTE regulatory rules and demo institution successfully seeded."}
