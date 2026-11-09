from datetime import date
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import SessionLocal, Base, engine
from app.models.entities import Institution, Programme, Approval, Student, Enrolment, User
from app.core.security import get_password_hash, create_access_token

client = TestClient(app)

@pytest.fixture(scope="module", autouse=True)
def setup_slice3_data():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # Ensure demo institution & programme exist
    inst = db.query(Institution).filter(Institution.pid == "1-10293847").first()
    if not inst:
        inst = Institution(
            pid="1-10293847",
            name="College of Engineering Pune",
            address="Shivajinagar, Pune",
            state="Maharashtra",
            district="Pune",
            regional_office="WRO",
            institution_type="GOVERNMENT",
            status="ACTIVE"
        )
        db.add(inst)
        db.flush()

    prog = db.query(Programme).filter(Programme.institution_id == inst.institution_id).first()
    if not prog:
        prog = Programme(
            institution_id=inst.institution_id,
            programme_name="Computer Engineering",
            level="UG",
            duration_years=4
        )
        db.add(prog)
        db.flush()

    appr = db.query(Approval).filter(Approval.programme_id == prog.programme_id).first()
    if not appr:
        appr = Approval(
            programme_id=prog.programme_id,
            academic_year="2026-27",
            eoa_reference_number="AICTE/WRO/1-10293847/2026/EOA",
            approved_intake=120
        )
        db.add(appr)
        db.flush()

    # Ensure test student exists and reset status to ACTIVE for idempotent runs
    student = db.query(Student).filter(Student.student_id == "std-slice3-test-01").first()
    if not student:
        student = Student(
            student_id="std-slice3-test-01",
            full_name="Slice 3 Test Student",
            dob=date(2004, 5, 15),
            gender="Female",
            identity_status="VERIFIED"
        )
        db.add(student)
        db.flush()

    enrolment = db.query(Enrolment).filter(Enrolment.enrolment_id == "enr-slice3-test-01").first()
    if not enrolment:
        enrolment = Enrolment(
            enrolment_id="enr-slice3-test-01",
            student_id=student.student_id,
            programme_id=prog.programme_id,
            academic_year="2026-27",
            admission_year=2026,
            roll_number_institutional="COEP-CS-99",
            enrolment_status="ACTIVE",
            enrolment_date=date(2026, 8, 1)
        )
        db.add(enrolment)
    else:
        enrolment.enrolment_status = "ACTIVE"

    # Ensure AICTE HQ user exists
    hq_user = db.query(User).filter(User.email == "director.regulation@aicte.gov.in").first()
    if not hq_user:
        hq_user = User(
            user_id="usr-hq-dir-01",
            email="director.regulation@aicte.gov.in",
            hashed_password=get_password_hash("AdminPass@2026"),
            full_name="Dr. Director Regulation",
            role="AICTE_HQ",
            is_active=True
        )
        db.add(hq_user)

    db.commit()
    db.close()

def test_module9_national_macro_metrics():
    """Verify national macro metrics computation."""
    res = client.get("/api/v1/analytics/macro-metrics")
    assert res.status_code == 200
    data = res.json()
    assert "total_approved_intake" in data
    assert "reporting_institutions" in data
    assert "apaar_saturation_pct" in data
    assert "national_compliance_rate_pct" in data
    assert data["total_approved_intake"] >= 120

def test_module9_regional_heatmap():
    """Verify state & regional office intake utilization heatmap."""
    res = client.get("/api/v1/analytics/regional-heatmap")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    first_region = data[0]
    assert "state" in first_region
    assert "regional_office" in first_region
    assert "intake_utilization_pct" in first_region
    assert "risk_status" in first_region

def test_module9_institutional_risk_scoring():
    """Verify Institutional Compliance Risk Index ranking."""
    res = client.get("/api/v1/analytics/institutional-risk-scores")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    top_inst = data[0]
    assert "risk_score" in top_inst
    assert "risk_tier" in top_inst
    assert top_inst["risk_tier"] in ["LOW", "MEDIUM", "HIGH"]

def test_module8_student_repository_query():
    """Verify querying student records across institutions."""
    res = client.get("/api/v1/students?search=Slice 3 Test")
    assert res.status_code == 200
    data = res.json()
    assert data["total_count"] >= 1
    record = data["records"][0]
    assert record["full_name"] == "Slice 3 Test Student"
    assert record["enrolment_status"] == "ACTIVE"

def test_module8_student_status_transition_with_audit_trail():
    """Verify temporal state transition and tamper-evident SHA-256 block creation."""
    # Obtain token for AICTE_HQ
    token = create_access_token({"sub": "usr-hq-dir-01", "role": "AICTE_HQ"})

    payload = {
        "new_status": "WITHDRAWN",
        "reason": "Student migrated to state medical counselling round 2."
    }
    res = client.post(
        "/api/v1/students/enr-slice3-test-01/transition-status",
        json=payload,
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["previous_status"] == "ACTIVE"
    assert data["current_status"] == "WITHDRAWN"
    assert "audit_hash" in data
    assert len(data["audit_hash"]) == 64 # SHA-256 length
