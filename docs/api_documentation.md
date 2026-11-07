# API Documentation: Waymark APAAR Hub
**Base URL:** `https://api.apaar-aicte.gov.in/api/v1` (Mock sandbox: `http://localhost:8000/api/v1`)  
**Specification Standard:** OpenAPI 3.0.3 / RESTful JSON  
**Authentication Scheme:** Bearer JWT Token (`Authorization: Bearer <access_token>`)  

---

## 1. Authentication & Session Management

### 1.1 User Login
`POST /auth/login`
Authenticates AICTE Officers, Institutional Nodal Officers, Students, and Verifiers.

**Request Headers:**
`Content-Type: application/json`

**Request Body:**
```json
{
  "email": "nodal@coep.ac.in",
  "password": "SecurePassword123!",
  "role": "INSTITUTION_NODAL"
}
```

**Response (200 OK):**
```json
{
  "status": "success",
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsIn...",
    "token_type": "bearer",
    "expires_in": 3600,
    "user": {
      "user_id": "usr_9921e42",
      "name": "Dr. R. K. Sharma",
      "email": "nodal@coep.ac.in",
      "role": "INSTITUTION_NODAL",
      "institution_id": "inst_ai_0042",
      "institution_pid": "1-10293847"
    }
  }
}
```

---

## 2. Institution & Approval Endpoints

### 2.1 Get Institution Profile & Approved Intake
`GET /institutions/{institution_id}/approvals?academic_year=2026-27`
Fetches official AICTE approved intake and authorized supernumerary quotas for the specified academic year.

**Response (200 OK):**
```json
{
  "status": "success",
  "data": {
    "institution_id": "inst_ai_0042",
    "pid": "1-10293847",
    "name": "College of Engineering Pune",
    "status": "ACTIVE",
    "academic_year": "2026-27",
    "eoa_reference": "AICTE/WRO/1-10293847/2026/EOA",
    "programmes": [
      {
        "programme_id": "prog_cs_01",
        "name": "Computer Engineering",
        "level": "UG",
        "approved_intake": 120,
        "supernumerary_quotas": {
          "nri_max_pct": 5.0,
          "nri_seat_cap": 6,
          "fn_oci_ciwg_approved": true,
          "fn_oci_ciwg_seat_cap": 18,
          "tfw_approved": true,
          "tfw_seat_cap": 6,
          "pm_uspy_seat_cap": 2,
          "gifted_children_seat_cap": 2
        },
        "enrolment_summary": {
          "regular_enrolled": 114,
          "nri_enrolled": 6,
          "supernumerary_enrolled": 16,
          "total_active_enrolled": 136,
          "total_allowed_capacity": 148,
          "flags_count": 0
        }
      }
    ]
  }
}
```

---

## 3. Student Ingestion & Bulk ETL Endpoints

### 3.1 Bulk Upload Student Data (File Multipart)
`POST /ingestion/upload`
Accepts `.xlsx` or `.csv` files containing batch student admission records.

**Request (multipart/form-data):**
- `file`: `students_admitted_2026.xlsx`
- `institution_id`: `inst_ai_0042`
- `programme_id`: `prog_cs_01`
- `academic_year`: `2026-27`
- `dry_run`: `false` *(if `true`, validates and reports without writing to DB)*

**Response (202 Accepted):**
```json
{
  "status": "processing",
  "data": {
    "batch_id": "batch_9a87f10b",
    "total_records": 130,
    "dry_run": false,
    "status_url": "/ingestion/batches/batch_9a87f10b/status"
  }
}
```

### 3.2 Ingestion Batch Status & Granular Error Report
`GET /ingestion/batches/{batch_id}/status`

**Response (200 OK):**
```json
{
  "status": "success",
  "data": {
    "batch_id": "batch_9a87f10b",
    "state": "COMPLETED",
    "summary": {
      "total": 130,
      "valid": 124,
      "flagged": 6,
      "rejected": 0
    },
    "flags": [
      {
        "row_number": 42,
        "student_temp_id": "TEMP_042",
        "apaar_id": "992144321098",
        "rule_id": "RULE_CROSS_INSTITUTION_DUPLICATE",
        "severity": "CRITICAL",
        "message": "Student APAAR ID already has active enrolment in VJTI Mumbai (PID 1-20394857).",
        "clause_ref": "APH 2024-27 Norms"
      },
      {
        "row_number": 128,
        "student_temp_id": "TEMP_128",
        "apaar_id": null,
        "rule_id": "RULE_APAAR_MISSING",
        "severity": "WARNING",
        "message": "APAAR ID not supplied. Record registered in PENDING_APAAR provisional status.",
        "clause_ref": "SIH 26263 Core Spec"
      }
    ],
    "download_error_report_url": "/ingestion/batches/batch_9a87f10b/export-errors"
  }
}
```

### 3.3 Direct Student Record Ingestion (REST API for ERPs)
`POST /students/enrol`
Synchronous endpoint for modern college ERPs to register individual students upon admission confirmation.

**Request Body:**
```json
{
  "institution_id": "inst_ai_0042",
  "programme_id": "prog_cs_01",
  "academic_year": "2026-27",
  "student": {
    "apaar_id": "123456789012",
    "institutional_roll_no": "2026-BTECH-CS-041",
    "university_reg_no": "SPPU-2026-9921",
    "full_name": "Aarav Rajesh Patil",
    "dob": "2005-08-14",
    "gender": "MALE",
    "admission_details": {
      "admission_date": "2026-08-10",
      "admission_channel": "STATE_CENTRALIZED_COUNSELLING",
      "seat_category": "TFW",
      "annual_family_income": 450000,
      "counselling_allotment_id": "CAP-MH-2026-88192"
    }
  }
}
```

**Response (201 Created):**
```json
{
  "status": "success",
  "data": {
    "enrolment_id": "enr_81f9a0c2",
    "student_id": "stu_4019fa11",
    "apaar_status": "VERIFIED",
    "enrolment_status": "ACTIVE",
    "regulatory_check": {
      "intake_compliant": true,
      "category_cap_status": "WITHIN_LIMITS (TFW: 4 of 6 used)"
    },
    "audit_hash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
  }
}
```

---

## 4. Validation & Regulatory Rule Engine Endpoints

### 4.1 Validate APAAR ID
`POST /validation/apaar/verify`
Tests format, Verhoeff checksum, and registry lookup via adapter.

**Request Body:**
```json
{
  "apaar_id": "123456789012",
  "demographic_check": {
    "full_name": "Aarav Rajesh Patil",
    "dob": "2005-08-14"
  }
}
```

**Response (200 OK):**
```json
{
  "status": "success",
  "data": {
    "apaar_id": "123456789012",
    "format_valid": true,
    "checksum_valid": true,
    "registry_match": true,
    "match_confidence": 0.98,
    "verification_token": "tok_apaar_vld_88291a"
  }
}
```

### 4.2 Run Programme Intake & Compliance Evaluation
`POST /validation/compliance/evaluate`
Executes AICTE rule suite against a programme's enrolled roster.

**Request Body:**
```json
{
  "institution_id": "inst_ai_0042",
  "programme_id": "prog_cs_01",
  "academic_year": "2026-27"
}
```

**Response (200 OK):**
```json
{
  "status": "success",
  "data": {
    "compliant": false,
    "intake_metrics": {
      "approved_intake": 120,
      "regular_enrolled": 122,
      "excess_regular_intake": 2,
      "nri_enrolled": 7,
      "nri_cap": 6,
      "excess_nri_intake": 1
    },
    "violations": [
      {
        "rule_code": "APH_2024_27_RULE_7_4_G",
        "clause": "Clause 7.4(g) Excess Admission",
        "description": "Total admissions in within-intake pool exceed approved capacity by 2 seats.",
        "severity": "CRITICAL",
        "indicative_penalty_formula": "5x Tuition Fee per excess student under APH 7.3(g)"
      },
      {
        "rule_code": "APH_2024_27_RULE_2_8_B",
        "clause": "Clause 2.8(b) NRI Quota Cap",
        "description": "NRI admissions (7) exceed 5% statutory limit (6).",
        "severity": "CRITICAL"
      }
    ]
  }
}
```

---

## 5. Dashboards, Anomaly & Risk Analytics

### 5.1 AICTE National Analytics & Risk Ranking
`GET /analytics/national-summary`
Provides macro-level metrics for the AICTE Headquarters dashboard.

**Response (200 OK):**
```json
{
  "status": "success",
  "data": {
    "overview": {
      "total_approved_institutions": 9840,
      "reporting_institutions": 8920,
      "reporting_percentage": 90.65,
      "total_approved_intake": 3200000,
      "total_students_enrolled": 2840500,
      "apaar_verified_percentage": 92.4,
      "flagged_irregularities_count": 482
    },
    "high_risk_institutions": [
      {
        "institution_id": "inst_ai_9912",
        "name": "Apex Institute of Technology",
        "state": "Uttar Pradesh",
        "risk_score": 88.5,
        "critical_flags": 14,
        "excess_admission_count": 22
      }
    ],
    "state_wise_distribution": [
      {
        "state": "Maharashtra",
        "approved_intake": 410000,
        "enrolled": 395000,
        "cross_institution_duplicates": 12
      }
    ]
  }
}
```

---

## 6. DPDP-Compliant Verification & Consent Endpoints

### 6.1 Create Verification Request (Verifier/Employer)
`POST /verification/requests`
Submits a third-party request to verify academic credentials.

**Request Body:**
```json
{
  "verifier_id": "ver_tcs_hr_01",
  "apaar_id": "123456789012",
  "purpose": "EMPLOYMENT_BACKGROUND_VERIFICATION",
  "requested_fields": ["student_name", "institution_name", "programme_name", "enrolment_status", "graduation_year"]
}
```

**Response (201 Created):**
```json
{
  "status": "success",
  "data": {
    "request_id": "vreq_77a90f12",
    "consent_status": "PENDING_STUDENT_APPROVAL",
    "consent_notification_sent": true,
    "valid_until": "2026-11-14T23:59:59Z"
  }
}
```

### 6.2 Student Consent Decision (Student App)
`POST /verification/consent/{request_id}/decision`

**Request Body:**
```json
{
  "student_id": "stu_4019fa11",
  "decision": "APPROVED",
  "allowed_fields": ["student_name", "institution_name", "programme_name", "enrolment_status"],
  "signature_proof": "sig_ed25519_student_auth_token"
}
```

**Response (200 OK):**
```json
{
  "status": "success",
  "message": "Consent granted with field-level scoping."
}
```

### 6.3 Retrieve Signed Verification Record (Verifier)
`GET /verification/requests/{request_id}/result`

**Response (200 OK):**
```json
{
  "status": "success",
  "data": {
    "verification_id": "vcert_9901a88",
    "verified_at": "2026-11-08T09:15:00Z",
    "issuer": "AICTE National Verification Authority",
    "student_academic_record": {
      "apaar_id_masked": "XXXXXXXX9012",
      "student_name": "Aarav Rajesh Patil",
      "institution": "College of Engineering Pune",
      "programme": "Computer Engineering (B.Tech)",
      "enrolment_status": "ACTIVE_STUDENT",
      "admission_year": "2026"
    },
    "cryptographic_proof": {
      "signature_algorithm": "SHA256withECDSA",
      "public_key_fingerprint": "a1:b2:c3:d4:e5:f6:...",
      "digital_signature": "MEQCIG9...",
      "qr_code_data_uri": "data:image/png;base64,iVBORw0KGgo..."
    }
  }
}
```

---

## 7. Audit & Tamper-Evidence Endpoints

### 7.1 Verify Audit Chain Integrity
`GET /audit/verify-chain?start_block=1&end_block=1000`
Calculates cumulative SHA-256 integrity to prove records have not been altered directly in the SQL database.

**Response (200 OK):**
```json
{
  "status": "success",
  "data": {
    "chain_intact": true,
    "verified_blocks": 1000,
    "genesis_hash": "0000000000000000000...",
    "latest_block_hash": "7a38b1c48209e99a8...",
    "tampering_detected": false
  }
}
```

