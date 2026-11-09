from datetime import date
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import SessionLocal, Base, engine
from app.models.entities import Institution, Programme, Approval, Student, Enrolment, User, StudentIdentity
from app.core.security import get_password_hash, create_access_token

client = TestClient(app)

@pytest.fixture(scope="module", autouse=True)
def setup_slice4_data():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # Create Student Aarav Sharma for DPDP verification testing
    student = db.query(Student).filter(Student.student_id == "std-slice4-aarav-01").first()
    if not student:
        student = Student(
            student_id="std-slice4-aarav-01",
            full_name="Aarav Sharma",
            dob=date(2005, 4, 12),
            gender="Male",
            identity_status="VERIFIED"
        )
        db.add(student)
        db.flush()

        # Add Identity checksum for 9021-4412-8873
        import hashlib
        apaar_clean = "902144128873"
        apaar_hash = hashlib.sha256(apaar_clean.encode("utf-8")).hexdigest()

        ident = StudentIdentity(
            student_id=student.student_id,
            identity_type="APAAR",
            identity_value_encrypted="ENC_MOCK_VALUE",
            identity_masked="XXXX-XXXX-8873",
            identity_checksum_hash=apaar_hash,
            verification_source="VERHOEFF_GATEWAY"
        )
        db.add(ident)

        # Enrolment
        prog = db.query(Programme).first()
        if prog:
            enr = Enrolment(
                enrolment_id="enr-slice4-aarav-01",
                student_id=student.student_id,
                programme_id=prog.programme_id,
                academic_year="2026-27",
                admission_year=2026,
                roll_number_institutional="COEP-ME-2026-084",
                enrolment_status="ACTIVE",
                enrolment_date=date(2026, 8, 1)
            )
            db.add(enr)

    # Student user for auth
    stu_user = db.query(User).filter(User.email == "student@coep.ac.in").first()
    if not stu_user:
        stu_user = User(
            user_id="std-slice4-aarav-01",
            email="student@coep.ac.in",
            hashed_password=get_password_hash("StudentPass@2026"),
            full_name="Aarav Sharma",
            role="STUDENT",
            is_active=True
        )
        db.add(stu_user)

    db.commit()
    db.close()

def test_module11_create_and_revoke_dpdp_consent():
    """Verify student purpose-bound consent grant and Section 6(4) revocation."""
    token = create_access_token({"sub": "std-slice4-aarav-01", "role": "STUDENT"})

    # 1. Grant Consent
    grant_payload = {
        "verifier_id": "hr@tcs.com",
        "purpose": "PRE_EMPLOYMENT_BACKGROUND_CHECK",
        "scope_fields": ["full_name", "institution", "programme", "enrolment_status"],
        "expires_in_hours": 48
    }
    res_grant = client.post(
        "/api/v1/dpdp/consents",
        json=grant_payload,
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res_grant.status_code == 200
    consent_data = res_grant.json()
    assert consent_data["status"] == "GRANTED"
    assert "consent_id" in consent_data
    consent_id = consent_data["consent_id"]

    # 2. List Consents
    res_list = client.get(
        "/api/v1/dpdp/consents/my-consents",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res_list.status_code == 200
    consents_list = res_list.json()
    assert len(consents_list) >= 1

    # 3. Revoke Consent
    res_revoke = client.post(
        f"/api/v1/dpdp/consents/{consent_id}/revoke",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res_revoke.status_code == 200
    revoke_data = res_revoke.json()
    assert revoke_data["status"] == "REVOKED"

def test_module11_and_12_verifier_cryptographic_assertion():
    """Verify third-party verifier query, signature token, and dynamic QR verification link."""
    verify_payload = {
        "apaar_id": "9021-4412-8873",
        "full_name": "Aarav Sharma",
        "date_of_birth": "2005-04-12",
        "verifier_id": "hr@tcs.com",
        "purpose": "PRE_EMPLOYMENT_BACKGROUND_CHECK"
    }
    res = client.post("/api/v1/dpdp/verify", json=verify_payload)
    assert res.status_code == 200
    data = res.json()
    assert data["verified"] is True
    assert data["status"] == "AUTHENTICATED"
    assert "AICTE-SIG-" in data["verification_token"]
    assert "https://waymark.aicte.gov.in/verify/credential" in data["qr_verification_url"]
    assert "candidate_name" in data["disclosed_fields"]

def test_module12_audit_ledger_chain_integrity():
    """Verify entire SHA-256 linear chain recalculation and tamper detection."""
    res = client.get("/api/v1/audit/ledger/verify-chain")
    assert res.status_code == 200
    data = res.json()
    assert data["is_chain_valid"] is True
    assert data["total_blocks_checked"] >= 1
    assert len(data["tampered_blocks"]) == 0
    assert "zero tampering detected" in data["message"].lower()

