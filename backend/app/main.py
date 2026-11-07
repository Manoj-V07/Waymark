import io
from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, Form, Response
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.database import engine, Base, get_db
from app.models.entities import (
    RegulatoryRule, Institution, Programme, Approval, SeatApproval, User,
    IngestionBatch, Enrolment, Student, StudentIdentity, AuditLog, ValidationResult
)
from app.core.security import get_password_hash
from app.services.regulatory_engine import RegulatoryRuleEngine
from app.services.apaar_validator import APAARValidator
from app.services.ingestion_parser import IngestionParser
from app.services.ingestion_service import AdmissionIngestionService

# Create all database tables
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
        "ingestion_engine": "ready"
    }

# ----------------- SLICE 1: INGESTION & TEMPLATE ENDPOINTS -----------------

@app.get(f"{settings.API_V1_STR}/ingestion/template")
def download_template(format: str = "csv"):
    """Generates standard AICTE Student Admission import template."""
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
    """
    Parses and processes bulk Excel/CSV student admissions.
    Supports dry-run validation, row-level error reporting, and SHA-256 audit hashing.
    """
    contents = await file.read()
    records, flags = IngestionParser.parse_file_contents(contents, file.filename)

    if not records and flags:
        # File parsing failure
        return {
            "status": "rejected",
            "message": flags[0]["violation_message"],
            "flags": flags
        }

    # Execute ingestion service
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

@app.get(f"{settings.API_V1_STR}/institutions/active")
def list_active_institutions(db: Session = Depends(get_db)):
    """Returns active institutions and their approved programmes for the upload dropdown."""
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

@app.get(f"{settings.API_V1_STR}/audit/chain")
def get_audit_chain(limit: int = 10, db: Session = Depends(get_db)):
    """Fetches the latest tamper-evident audit blocks with SHA-256 links."""
    logs = db.query(AuditLog).order_by(AuditLog.log_id.desc()).limit(limit).all()
    return logs

# ----------------- REGULATORY & VALIDATION ENDPOINTS -----------------

@app.get(f"{settings.API_V1_STR}/rules")
def get_regulatory_rules(academic_year: str = "2026-27", db: Session = Depends(get_db)):
    rules = db.query(RegulatoryRule).filter(RegulatoryRule.is_active == True).all()
    if not rules:
        return RegulatoryRuleEngine.get_active_rules(db=db, academic_year=academic_year)
    return rules

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
