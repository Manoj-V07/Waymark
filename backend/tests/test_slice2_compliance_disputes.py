import pytest
from datetime import date
from app.core.database import SessionLocal, Base, engine
from app.models.entities import Institution, Programme, Approval, Enrolment, RegulatoryCase, AuditLog, Student
from app.schemas.admission import OpenCaseRequest, InstitutionCaseResponse, OfficerDecisionRequest
from app.services.duplicate_detector import DuplicateAnomalyDetector
from app.services.regulatory_engine import RegulatoryRuleEngine
from app.main import (
    evaluate_programme_compliance, detect_near_duplicates_in_programme,
    open_regulatory_case, submit_institution_response, record_officer_decision,
    list_regulatory_cases, seed_demo_data
)

@pytest.fixture(scope="module")
def db_session():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    seed_demo_data(db)
    yield db
    db.close()

# ----------------- MODULE 6 TESTS: REGULATORY ENGINE -----------------
def test_module_6_pool_deconstruction_and_compliance(db_session):
    """
    Tests APH 2024-27 intake rules:
    - Clause 2.8(b): NRI capped at 5% within approved intake.
    - Clause 7.4(g): Admissions within intake pool must not exceed approved intake.
    - Supernumerary seats (FN/OCI & TFW) must not trigger regular excess flags.
    """
    eval_result = RegulatoryRuleEngine.evaluate_programme_intake(
        approved_intake=120,
        enrolled_regular=114,
        enrolled_nri=6,             # 5% of 120 = 6 (Compliant)
        enrolled_supernumerary={
            "FN_OCI_CIWG": 18,      # 15% of 120 = 18 (Compliant)
            "TFW": 6                # 5% of 120 = 6 (Compliant)
        },
        has_fn_approval=True,
        has_tfw_approval=True
    )
    assert eval_result["compliant"] is True
    assert eval_result["within_intake_admitted"] == 120
    assert eval_result["total_enrolled"] == 144
    assert len(eval_result["flags"]) == 0

    # Test excess regular admission
    excess_result = RegulatoryRuleEngine.evaluate_programme_intake(
        approved_intake=120,
        enrolled_regular=122,       # Exceeds by 2
        enrolled_nri=6,
        enrolled_supernumerary={}
    )
    assert excess_result["compliant"] is False
    assert any(f["rule_code"] == "RULE_INTAKE_CAP" for f in excess_result["flags"])
    excess_flag = [f for f in excess_result["flags"] if f["rule_code"] == "RULE_INTAKE_CAP"][0]
    assert excess_flag["excess_count"] == 8 # 128 - 120

# ----------------- MODULE 7 TESTS: TF-IDF ANOMALY DETECTION -----------------
def test_module_7_tfidf_near_duplicate_detection():
    """Tests scikit-learn TF-IDF char n-grams detecting near-duplicate student demographics."""
    candidates = [
        {"student_id": "1", "name": "Arun Kumar", "dob": "2005-05-12", "apaar": "APAAR_A"},
        {"student_id": "2", "name": "Arunkumar", "dob": "2005-05-12", "apaar": "APAAR_B"},
        {"student_id": "3", "name": "Pooja Sharma", "dob": "2004-11-20", "apaar": "APAAR_C"}
    ]

    suspects = DuplicateAnomalyDetector.detect_fuzzy_demographic_matches(candidates, threshold=0.80)
    assert len(suspects) == 1
    match = suspects[0]
    assert match["rule_code"] == "RULE_NEAR_DUPLICATE_NAME"
    assert match["confidence_score"] > 0.80
    assert "Arun Kumar" in match["violation_message"]

# ----------------- MODULE 10 TESTS: DISPUTE & CASE WORKFLOW -----------------
def test_module_10_end_to_end_dispute_workflow(db_session):
    """
    Tests complete non-automated human officer dispute resolution workflow:
    1. Show-cause case opened by AICTE Officer.
    2. Written response & proof submitted by Institution Nodal Officer.
    3. Human officer records decision and writes SHA-256 audit entry.
    """
    inst = db_session.query(Institution).first()
    prog = inst.programmes[0]

    # 1. Open Show-Cause Case
    open_req = OpenCaseRequest(
        institution_id=inst.institution_id,
        programme_id=prog.programme_id,
        academic_year="2026-27",
        rule_code="RULE_INTAKE_CAP",
        clause_reference="APH Clause 7.4(g)",
        violation_summary="Excess 4 admissions detected in Computer Engineering.",
        excess_count=4,
        indicative_penalty_inr=100000.0,
        show_cause_notice="Provide explanation for 4 admissions above sanctioned capacity."
    )
    open_res = open_regulatory_case(open_req, db_session)
    assert open_res["status"] == "success"
    case = open_res["case"]
    assert case.status == "SHOW_CAUSE_ISSUED"
    assert "audit_hash" in open_res

    # 2. Institution Submits Response
    resp_req = InstitutionCaseResponse(
        institution_response="Admissions were directed under High Court Order WP-48192/2026 for state quota merit.",
        supporting_doc_ref="HC_ORDER_MH_WP48192.pdf"
    )
    resp_res = submit_institution_response(case.case_id, resp_req, db_session)
    assert resp_res["status"] == "success"
    assert resp_res["case"].status == "RESPONSE_SUBMITTED"

    # 3. Officer Decision Recorded
    dec_req = OfficerDecisionRequest(
        decision="EXEMPTED_MERIT",
        remarks="Court order verified and approved. Exemption granted under APH norms.",
        officer_name="Dr. B. K. Murthy (Regional Director)"
    )
    dec_res = record_officer_decision(case.case_id, dec_req, db_session)
    assert dec_res["status"] == "success"
    assert dec_res["decision"] == "EXEMPTED_MERIT"
    assert dec_res["case"].status == "RESOLVED_EXEMPT"

    # Verify latest audit log block belongs to case decision
    audit = db_session.query(AuditLog).order_by(AuditLog.log_id.desc()).first()
    assert audit.action == "CASE_DECISION_RECORDED"
    assert audit.current_block_hash == dec_res["audit_hash"]

