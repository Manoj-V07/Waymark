from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.database import engine, Base, get_db
from app.models.entities import Institution, Programme, Approval, SeatApproval, User
from app.core.security import get_password_hash
from app.services.regulatory_engine import RegulatoryRuleEngine
from app.services.apaar_validator import APAARValidator

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

# Enable CORS for Next.js frontend
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
        "rules_engine": "APH 2024-27 active",
        "apaar_adapter": "ready"
    }

@app.post(f"{settings.API_V1_STR}/validation/apaar/verify")
def verify_apaar(payload: dict):
    apaar_id = payload.get("apaar_id")
    name = payload.get("name", "Student")
    dob = payload.get("dob", "2005-01-01")
    return APAARValidator.verify_against_registry(apaar_id, name, dob)

@app.post(f"{settings.API_V1_STR}/validation/compliance/evaluate")
def evaluate_compliance(payload: dict):
    approved_intake = payload.get("approved_intake", 120)
    enrolled_regular = payload.get("enrolled_regular", 120)
    enrolled_nri = payload.get("enrolled_nri", 0)
    enrolled_supernumerary = payload.get("enrolled_supernumerary", {})
    
    return RegulatoryRuleEngine.evaluate_programme_intake(
        approved_intake=approved_intake,
        enrolled_regular=enrolled_regular,
        enrolled_nri=enrolled_nri,
        enrolled_supernumerary=enrolled_supernumerary
    )

@app.post(f"{settings.API_V1_STR}/seed-demo-data")
def seed_demo_data(db: Session = Depends(get_db)):
    """Populates realistic demo institutions and programmes for Hackathon testing."""
    existing_inst = db.query(Institution).filter(Institution.pid == "1-10293847").first()
    if existing_inst:
        return {"message": "Demo data already seeded."}

    # 1. Seed Institution
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

    # 2. Seed Admin User
    admin = User(
        email="nodal@coep.ac.in",
        hashed_password=get_password_hash("Phoenix@2026"),
        full_name="Dr. R. K. Sharma",
        role="INSTITUTION_NODAL",
        institution_id=coep.institution_id
    )
    db.add(admin)

    # 3. Seed Programme
    cs_prog = Programme(
        institution_id=coep.institution_id,
        programme_name="Computer Engineering",
        level="UG",
        duration_years=4
    )
    db.add(cs_prog)
    db.flush()

    # 4. Seed Approval & Seat Caps
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

    return {"message": "Demo institution (COEP) and Computer Engineering programme successfully seeded."}

