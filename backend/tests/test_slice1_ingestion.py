import pytest
import io
import pandas as pd
from app.services.apaar_validator import APAARValidator
from app.services.ingestion_parser import IngestionParser
from app.services.ingestion_service import AdmissionIngestionService
from app.core.database import SessionLocal, Base, engine
from app.models.entities import Institution, Programme, Approval, Enrolment, AuditLog

@pytest.fixture(scope="module")
def db_session():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    yield db
    db.close()

def test_apaar_syntax_and_verhoeff():
    """Tests 12-digit format and Verhoeff check-digit algorithms."""
    valid, res = APAARValidator.validate_format("123456789012")
    assert valid is True
    assert res == "123456789012"

    # Too short
    invalid_short, err_short = APAARValidator.validate_format("12345")
    assert invalid_short is False
    assert "12 numeric digits" in err_short

    # Alpha characters
    invalid_alpha, err_alpha = APAARValidator.validate_format("12345678901A")
    assert invalid_alpha is False

def test_ingestion_parser_with_sample_template():
    """Tests parsing of standardized template DataFrame."""
    df = IngestionParser.generate_template_dataframe()
    csv_bytes = df.to_csv(index=False).encode("utf-8")
    records, flags = IngestionParser.parse_file_contents(csv_bytes, "test.csv")

    assert len(records) == 3
    # Check that Tariq (row with missing APAAR) is marked PENDING_APAAR and flagged as warning
    pending_row = [r for r in records if r["full_name"] == "Tariq Ahmad Bhat"][0]
    assert pending_row["apaar_status"] == "PENDING_APAAR"
    assert any(f["rule_code"] == "RULE_APAAR_NOT_PROVIDED" for f in flags)

def test_dry_run_vs_live_commit(db_session):
    """Verifies that dry-run commits zero rows while live commit persists enrolments and audit hash."""
    inst = db_session.query(Institution).filter(Institution.pid == "1-10293847").first()
    if not inst:
        # Create test inst
        inst = Institution(
            pid="1-10293847",
            name="College of Engineering Pune",
            address="Shivajinagar, Pune",
            state="Maharashtra",
            district="Pune",
            regional_office="WRO",
            institution_type="GOVERNMENT"
        )
        db_session.add(inst)
        db_session.flush()
        prog = Programme(
            institution_id=inst.institution_id,
            programme_name="Computer Engineering",
            level="UG"
        )
        db_session.add(prog)
        db_session.commit()
    else:
        prog = inst.programmes[0]

    # Sample batch with 1 student
    test_records = [
        {
            "row_number": 2,
            "apaar_id": "887766554433",
            "apaar_status": "VERIFIED",
            "full_name": "Test Student Enrolment",
            "dob": "2005-01-01",
            "gender": "MALE",
            "email": "test@student.ac.in",
            "roll_number_institutional": "TEST-ROLL-99",
            "university_reg_number": "UNIV-99",
            "aicte_enrolment_number": "",
            "seat_category": "REGULAR_MERIT",
            "admission_channel": "CENTRAL_COUNSELLING",
            "allotment_order_ref": "ORDER-99",
            "annual_family_income": 300000
        }
    ]

    initial_enrolment_count = db_session.query(Enrolment).count()

    # 1. Execute Dry Run
    dry_result = AdmissionIngestionService.process_admission_batch(
        db=db_session,
        institution_id=inst.institution_id,
        programme_id=prog.programme_id,
        academic_year="2026-27",
        file_name="test_dry.csv",
        records=test_records,
        parsing_flags=[],
        dry_run=True
    )
    assert dry_result["status"] == "dry_run_complete"
    assert db_session.query(Enrolment).count() == initial_enrolment_count # Zero change

    # 2. Execute Live Commit
    live_result = AdmissionIngestionService.process_admission_batch(
        db=db_session,
        institution_id=inst.institution_id,
        programme_id=prog.programme_id,
        academic_year="2026-27",
        file_name="test_live.csv",
        records=test_records,
        parsing_flags=[],
        dry_run=False
    )
    assert live_result["status"] == "success"
    assert live_result["committed_enrolments"] == 1
    assert "audit_hash" in live_result

    # 3. Check SHA-256 Audit Chain Entry
    latest_audit = db_session.query(AuditLog).order_by(AuditLog.log_id.desc()).first()
    assert latest_audit.current_block_hash == live_result["audit_hash"]
    assert latest_audit.action == "BULK_STUDENT_ADMISSION_UPLOAD"

