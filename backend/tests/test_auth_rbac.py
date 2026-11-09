import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import SessionLocal, Base, engine
from app.models.entities import User
from app.core.security import get_password_hash, create_access_token

client = TestClient(app)

@pytest.fixture(scope="module", autouse=True)
def setup_test_users():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    # Check or seed test user
    test_user = db.query(User).filter(User.email == "test_nodal@coep.ac.in").first()
    if not test_user:
        test_user = User(
            user_id="usr-test-nodal-01",
            email="test_nodal@coep.ac.in",
            hashed_password=get_password_hash("Password@123"),
            full_name="Prof. Test Nodal",
            role="INSTITUTION_NODAL",
            institution_id="inst_ai_0042",
            is_active=True,
        )
        db.add(test_user)
        db.commit()
    db.close()

def test_auth_register_and_login():
    # 1. Register a new student user
    reg_payload = {
        "email": "student_test_99@coep.ac.in",
        "password": "StrongPassword@2026",
        "full_name": "Rohan Deshmukh",
        "role": "STUDENT"
    }
    res_reg = client.post("/api/v1/auth/register", json=reg_payload)
    assert res_reg.status_code in [200, 400] # 200 on first run, 400 if already registered

    # 2. Login with valid credentials
    login_payload = {
        "email": "student_test_99@coep.ac.in",
        "password": "StrongPassword@2026"
    }
    res_login = client.post("/api/v1/auth/login", json=login_payload)
    assert res_login.status_code == 200
    token_data = res_login.json()
    assert "access_token" in token_data
    assert token_data["token_type"] == "bearer"
    assert token_data["user"]["role"] == "STUDENT"

    token = token_data["access_token"]

    # 3. Fetch authenticated user profile (/auth/me)
    res_me = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res_me.status_code == 200
    profile = res_me.json()
    assert profile["email"] == "student_test_99@coep.ac.in"
    assert profile["role"] == "STUDENT"

def test_auth_invalid_credentials():
    bad_login = {
        "email": "nonexistent@aicte.gov.in",
        "password": "WrongPassword"
    }
    res = client.post("/api/v1/auth/login", json=bad_login)
    assert res.status_code == 401
    assert "Invalid email or password" in res.json()["detail"]
