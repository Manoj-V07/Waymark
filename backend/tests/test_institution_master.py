import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import SessionLocal, Base, engine
from app.models.entities import User, Institution, Programme, Approval, AuditLog
from app.core.security import get_password_hash, create_access_token

client = TestClient(app)

@pytest.fixture(scope="module", autouse=True)
def setup_master_test_environment():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    
    # 1. AICTE HQ User
    hq_user = db.query(User).filter(User.email == "hq_officer_master@aicte-india.org").first()
    if not hq_user:
        hq_user = User(
            user_id="usr-hq-master-01",
            email="hq_officer_master@aicte-india.org",
            hashed_password=get_password_hash("AicteHQ@2026"),
            full_name="Dr. S. K. Murthy (Director AICTE Approval)",
            role="AICTE_HQ",
            institution_id=None,
            is_active=True,
        )
        db.add(hq_user)

    # 2. Institutional Nodal User (Non-HQ)
    nodal_user = db.query(User).filter(User.email == "nodal_master_test@institution.edu").first()
    if not nodal_user:
        nodal_user = User(
            user_id="usr-nodal-master-01",
            email="nodal_master_test@institution.edu",
            hashed_password=get_password_hash("Nodal@2026"),
            full_name="Prof. Nodal Officer",
            role="INSTITUTION_NODAL",
            institution_id=None,
            is_active=True,
        )
        db.add(nodal_user)

    db.commit()
    db.close()

def get_tokens():
    hq_token = create_access_token({
        "sub": "usr-hq-master-01",
        "email": "hq_officer_master@aicte-india.org",
        "role": "AICTE_HQ",
        "institution_id": None
    })
    nodal_token = create_access_token({
        "sub": "usr-nodal-master-01",
        "email": "nodal_master_test@institution.edu",
        "role": "INSTITUTION_NODAL",
        "institution_id": None
    })
    return hq_token, nodal_token

def test_institution_master_lifecycle_and_audit():
    hq_token, nodal_token = get_tokens()
    headers_hq = {"Authorization": f"Bearer {hq_token}"}
    headers_nodal = {"Authorization": f"Bearer {nodal_token}"}

    # 1. Register new institution as AICTE_HQ (use dynamic unique PID to allow re-runs)
    import uuid
    unique_pid = f"1-{uuid.uuid4().hex[:8]}"
    reg_payload = {
        "pid": unique_pid,
        "name": "Pune Institute of Computer Technology",
        "address": "Dhankawadi, Pune",
        "state": "Maharashtra",
        "district": "Pune",
        "regional_office": "WRO",
        "institution_type": "PRIVATE_UNAIDED"
    }

    res_reg = client.post("/api/v1/institutions", json=reg_payload, headers=headers_hq)
    assert res_reg.status_code == 200
    inst_data = res_reg.json()
    inst_id = inst_data["institution_id"]
    assert inst_data["pid"] == unique_pid
    assert inst_data["status"] == "ACTIVE"

    # 2. RBAC Guard: Non-HQ user should be rejected (403 Forbidden)
    res_forbidden = client.put(
        f"/api/v1/institutions/{inst_id}",
        json={"name": "Hacked Name", "amendment_reason": "Unauthorized attempt"},
        headers=headers_nodal
    )
    assert res_forbidden.status_code == 403

    # 3. View Full Details
    res_details = client.get(f"/api/v1/institutions/{inst_id}/details", headers=headers_hq)
    assert res_details.status_code == 200
    details = res_details.json()
    assert details["pid"] == unique_pid
    assert details["status"] == "ACTIVE"
    assert len(details["programmes"]) >= 1
    assert len(details["audit_history"]) >= 1
    assert details["audit_history"][0]["action"] == "INSTITUTION_REGISTERED"

    # 4. Edit Institution Profile with reason
    edit_payload = {
        "address": "Survey No. 27, Pune-Satara Road, Dhankawadi, Pune - 411043",
        "district": "Pune City",
        "amendment_reason": "Updated campus address as per postal verification certificate."
    }
    res_edit = client.put(f"/api/v1/institutions/{inst_id}", json=edit_payload, headers=headers_hq)
    assert res_edit.status_code == 200
    assert "audit_hash" in res_edit.json()
    assert res_edit.json()["institution"]["address"] == edit_payload["address"]

    # 5. Add New Programme & Quota Caps
    prog_payload = {
        "programme_name": "Artificial Intelligence & Data Science",
        "level": "UG",
        "duration_years": 4,
        "approved_intake": 120,
        "academic_year": "2026-27",
        "seat_caps": {
            "NRI": 6,
            "FN_OCI_CIWG": 18,
            "TFW": 6
        }
    }
    res_prog = client.post(f"/api/v1/institutions/{inst_id}/programmes", json=prog_payload, headers=headers_hq)
    assert res_prog.status_code == 200
    prog_data = res_prog.json()
    prog_id = prog_data["programme_id"]
    assert prog_data["approved_intake"] == 120

    # 6. Amend Programme Sanctioned Intake & Supernumerary Quotas
    intake_update_payload = {
        "academic_year": "2026-27",
        "approved_intake": 180,
        "seat_caps": {
            "NRI": 9,
            "FN_OCI_CIWG": 27,
            "TFW": 9
        },
        "reason": "AICTE Approval Bureau sanctioned division expansion."
    }
    res_intake = client.put(
        f"/api/v1/institutions/{inst_id}/programmes/{prog_id}/eoa",
        json=intake_update_payload,
        headers=headers_hq
    )
    assert res_intake.status_code == 200
    assert res_intake.json()["approved_intake"] == 180

    # 7. Status-based Lifecycle Deactivation (APH Section 7.3)
    # Transition to UNDER_REVIEW
    res_review = client.patch(
        f"/api/v1/institutions/{inst_id}/status",
        json={
            "status": "UNDER_REVIEW",
            "reason": "Dispute investigation regarding supernumerary verification document."
        },
        headers=headers_hq
    )
    assert res_review.status_code == 200
    assert res_review.json()["new_status"] == "UNDER_REVIEW"

    # Transition to NO_ADMISSION
    res_no_adm = client.patch(
        f"/api/v1/institutions/{inst_id}/status",
        json={
            "status": "NO_ADMISSION",
            "reason": "Regulatory penalty under APH Clause 7.3(c) for academic session 2026-27."
        },
        headers=headers_hq
    )
    assert res_no_adm.status_code == 200
    assert res_no_adm.json()["new_status"] == "NO_ADMISSION"

    # Verify record still exists (never hard deleted!)
    res_check = client.get(f"/api/v1/institutions/{inst_id}/details", headers=headers_hq)
    assert res_check.status_code == 200
    assert res_check.json()["status"] == "NO_ADMISSION"

    # Check that audit history contains all lifecycle steps
    audit_trail = res_check.json()["audit_history"]
    actions = [a["action"] for a in audit_trail]
    assert "INSTITUTION_REGISTERED" in actions
    assert "INSTITUTION_PROFILE_UPDATED" in actions
    assert "PROGRAMME_ADDED" in actions
    assert "PROGRAMME_INTAKE_AMENDED" in actions
    assert "INSTITUTION_STATUS_CHANGED" in actions
