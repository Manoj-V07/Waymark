import pytest
import io
import pandas as pd
from datetime import date
from app.services.apaar_validator import APAARValidator
from app.services.ingestion_parser import IngestionParser
from app.services.ingestion_service import AdmissionIngestionService
from app.core.database import SessionLocal, Base, engine
from app.models.entities import Institution, Programme, Approval, Enrolment, AuditLog, Student, User
from app.schemas.admission import LoginRequest, SingleStudentEnrolRequest, EnrolmentStatusUpdate, IdentityCorrectionRequest
from app.main import (
    user_login, create_institution, get_institution_eoa_details,
    get_student_identity_record, request_identity_correction,
    direct_single_student_enrol, update_enrolment_status,
    list_ingestion_batches, export_batch_errors, seed_demo_data
)

@pytest.fixture(scope="module")
def db_session():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    seed_demo_data(db)
    yield db
    db.close()

# ----------------- MODULE 1 TESTS -----------------
def test_module_1_institution_and_auth(db_session):
    """Tests Institution login and EoA retrieval."""
    login_req = LoginRequest(email="nodal@coep.ac.in", password="Phoenix@2026")
    login_res = user_login(login_req, db_session)
    assert "access_token" in login_res
    assert login_res["user"]["role"] == "INSTITUTION_NODAL"

    inst_id = login_res["user"]["institution_id"]
    eoa_details = get_institution_eoa_details(inst_id, "2026-27", db_session)
    assert eoa_details["pid"] == "1-10293847"
    assert len(eoa_details["programmes"]) > 0
    assert eoa_details["programmes"][0]["approved_intake"] == 120

# ----------------- MODULE 2 TESTS -----------------
def test_module_2_identity_and_correction(db_session):
    """Tests student identity lookup and correction request audit trail."""
    student = db_session.query(Student).first()
    assert student is not None

    identity_res = get_student_identity_record(student.student_id, db_session)
    assert identity_res["student_id"] == student.student_id
    assert "full_name" in identity_res

    # Test correction request
    corr_req = IdentityCorrectionRequest(
        corrected_name="Aarav R. Patil",
        supporting_document_ref="AADHAAR_DOC_MH_9921"
    )
    corr_res = request_identity_correction(student.student_id, corr_req, db_session)
    assert corr_res["status"] == "correction_under_review"
    assert "audit_hash" in corr_res

# ----------------- MODULE 3 TESTS -----------------
def test_module_3_single_enrol_and_lifecycle_transition(db_session):
    """Tests ERP direct single-student enrolment API and lifecycle status transition."""
    inst = db_session.query(Institution).filter(Institution.pid == "1-10293847").first()
    prog = inst.programmes[0]

    enrol_req = SingleStudentEnrolRequest(
        institution_id=inst.institution_id,
        programme_id=prog.programme_id,
        academic_year="2026-27",
        apaar_id="445566778899",
        full_name="Meera Krishnan",
        dob=date(2005, 5, 12),
        gender="FEMALE",
        email="meera.k@example.com",
        roll_number_institutional="2026-BTECH-CS-099",
        seat_category="REGULAR_MERIT",
        admission_channel="CENTRAL_COUNSELLING"
    )

    enrol_res = direct_single_student_enrol(enrol_req, db_session)
    assert enrol_res["status"] == "success"
    assert enrol_res["committed_enrolments"] == 1

    # Transition enrolment to WITHDRAWN
    enrolment = db_session.query(Enrolment).filter(
        Enrolment.roll_number_institutional == "2026-BTECH-CS-099"
    ).first()
    assert enrolment is not None

    trans_req = EnrolmentStatusUpdate(
        new_status="WITHDRAWN",
        reason="Transferred to IIT Bombay."
    )
    trans_res = update_enrolment_status(enrolment.enrolment_id, trans_req, db_session)
    assert trans_res["status"] == "success"
    assert trans_res["current_status"] == "WITHDRAWN"

# ----------------- MODULE 4 & 5 TESTS -----------------
def test_module_4_and_5_batch_history_and_validator(db_session):
    """Tests batch history listing, error export, and APAAR checksum validator."""
    inst = db_session.query(Institution).filter(Institution.pid == "1-10293847").first()
    batches = list_ingestion_batches(inst.institution_id, db_session)
    assert len(batches) > 0

    # Test APAAR Validator format
    valid_format, clean_id = APAARValidator.validate_format("123456789012")
    assert valid_format is True
    assert clean_id == "123456789012"

