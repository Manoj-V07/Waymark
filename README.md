# Waymark APAAR Hub

An automated APAAR ID-based student data management and regulatory verification platform for AICTE-approved institutions across India. Built for Smart India Hackathon 2026 (Problem Statement SIH 26263) by Team Phoenix Crew (Team ID: 199751).

---

## 1. Executive Summary

Waymark APAAR Hub is an institutional admission governance platform designed for the All India Council for Technical Education (AICTE) Regulation Bureau. It establishes an authoritative, tamper-evident central repository linking every student admission to a unique Automated Permanent Academic Account Registry (APAAR) ID.

The platform continuously evaluates enrolments against the statutory AICTE Approval Process Handbook (APH 2024–27) rules, prevents duplicate admissions across universities using character-level TF-IDF similarity algorithms, enforces Digital Personal Data Protection (DPDP) Act 2023 consent protocols, and seals all operational actions in a linear SHA-256 chained audit ledger.

Governance Principle: "A flag never penalizes automatically; an authorized officer decides."

---

## 2. Platform Architecture and Technology Stack

The platform is architected as a modular, decoupled full-stack system:

- Frontend Architecture:
  - Framework: Next.js 14 with App Router and TypeScript
  - Styling: Tailwind CSS (Strict Government Aesthetic, Slate-50 background, Navy accents)
  - UI Design: Component-based architecture with sticky vertical sidebar navigation
  - Icons: Lucide React (Clean, professional interface without informal symbols)

- Backend Architecture:
  - Framework: FastAPI (Python 3.10) with asynchronous ASGI endpoints
  - Database Engine: SQLAlchemy 2.0 ORM with SQLite (development/testing) and PostgreSQL compatibility
  - Authentication: JSON Web Tokens (JWT) with salted SHA-256 password hashing
  - Algorithmic Engines: Scikit-learn (TF-IDF vectorizer), Python difflib (demographic matcher), and native Verhoeff check digit validation

- Security & Cryptography:
  - SHA-256 linear hash chaining for tamper-evident audit logging
  - HMAC-SHA256 digital signature tokens for third-party verifier credentials
  - Dynamic QR verification links linking directly to central verification endpoints

---

## 3. Modules and Implementation Scope

The platform delivers all 12 modules defined in the AICTE system specifications across 4 vertical slices:

### Module 1: Institution and Approval Master Management
- Ingestion and tracking of AICTE Permanent ID (PID) records.
- Authoritative Extension of Approval (EoA) store containing approved course intakes.
- Supernumerary quota approval management (NRI, FN/OCI/CIWG, TFW).

### Module 2: Student Identity Registry and APAAR Engine
- APAAR 12-digit syntax verification and Verhoeff check digit algorithm.
- Multi-state identity lifecycle: VERIFIED, PENDING_APAAR, ALTERNATIVE_ID.
- Public log redaction and identity masking (format: XXXX-XXXX-1234).

### Module 3: Student Enrolment Lifecycle Management
- Decouples persistent student identity from institutional enrolments.
- Categorization across regular merit, management quota, and supernumerary pools.
- Tracking of institutional roll numbers, academic years, and study levels.

### Module 4: High-Throughput Batch Data Ingestion
- Batch upload parser supporting Excel (.xlsx) and CSV files.
- Two-stage ingestion pipeline: Pre-commit dry-run validation followed by database commit.
- Dynamic error spreadsheet export highlighting line-by-line validation errors.

### Module 5: Pre-Admission and Verification Gateways
- Standardized verification adapter querying central academic registries.
- Support for mTLS mock transitions and live government API toggles.

### Module 6: AICTE Regulatory Rule Engine (APH 2024-27)
- Dynamic configurable rule parameters stored in database (runtime reconfigurable).
- Clause 2.8(b): NRI quota capped at 5 percent within approved intake.
- Clause 2.9: Foreign National / OCI / CIWG capped at 15 percent supernumerary.
- Clause 6.42: Tuition Fee Waiver (TFW) capped at 5 percent supernumerary.
- Clause 7.4(g): Strict enforcement against excess admissions in regular pools.

### Module 7: Duplicate and Demographic Anomaly Detection
- Level 1: Cross-institution concurrent enrolment collision on identical APAAR IDs.
- Level 2: Intra-batch duplicate detection within the same upload session.
- Level 3: Fuzzy demographic matching combining character n-gram TF-IDF cosine distance and SequenceMatcher algorithms for identical Date of Birth records.

### Module 8: Central Student Repository and State Ledger
- Authoritative multi-parameter query interface across colleges and programs.
- Non-destructive temporal lifecycle transitions (ACTIVE to WITHDRAWN, TRANSFERRED, SUSPENDED, COMPLETED).
- Every state transition produces an immutable SHA-256 audit block.

### Module 9: Multi-Stakeholder Dashboards and Analytics
- National macro analytics aggregating reporting colleges, intake capacity, and APAAR saturation.
- Regional Office (WRO, SRO, SWRO, NWRO, NRO, CRO) intake utilization heat-map.
- Institutional Compliance Risk Index (0 to 100) scoring institutions based on active violations and late submissions.

### Module 10: Regulatory Case and Dispute Workflow
- Automated dispute case generation for high-severity rule violations.
- Show-cause digital notice issuance and institutional documentary justification submission.
- Quasi-judicial review interface for regional directors (EXEMPTED_MERIT, INTAKE_ADJUSTED, PENALTY_CONFIRMED).
- Indicative penalty calculations under APH Chapter VII for officer reference.

### Module 11: DPDP-Compliant Consent and Verification Engine
- Granular, purpose-bound consent architecture aligned with India's DPDP Act 2023.
- Field-level redaction allowing students to specify which academic details are disclosed.
- Section 6(4) immediate consent revocation capability.

### Module 12: Digital Credentials, QR and Tamper-Evident Audit Ledger
- Verification assertion issuance with HMAC-SHA256 signature tokens.
- Dynamic tamper-proof verification QR code URLs.
- Linear SHA-256 audit ledger verifying entire sequence integrity from Genesis block to latest.

---

## 4. Role-Based Access Control (RBAC)

The platform provides dedicated workspaces tailored to four primary user personas:

1. AICTE HQ Officer (Central Regulation Bureau):
   - Access: National Overview, Regulatory Rule Engine, Demographic Anomalies, Regulatory Disputes, Institutions Master, Student Ledger, Audit Ledger.
   - Credentials (Demo): admin@aicte.gov.in / AdminPass@2026

2. Institution Nodal Officer (College Registrar):
   - Access: Student Ingestion Uploader, Regulatory Quota Evaluator, Dispute Justification Workspace, Student Ledger, APAAR Validator.
   - Credentials (Demo): nodal@coep.ac.in / Password@123

3. Enrolled Student:
   - Access: APAAR Identity Card with QR code, Academic Bank of Credits (ABC) tally, DPDP Consent Management Portal.
   - Credentials (Demo): student@coep.ac.in / StudentPass@2026

4. Third-Party Verifier (Corporate HR / Academic Auditor):
   - Access: Candidate Verification Suite, Cryptographic Assertion Certificate Export, DPDP Scope-Restricted Verification.
   - Credentials (Demo): hr@tcs.com / VerifierPass@2026

The frontend includes a one-click Quick Demo Switcher allowing evaluators to switch between personas instantly without manual credential re-entry.

---

## 5. Directory Structure

```
SIH-AICTE-APAAR/
|-- backend/
|   |-- app/
|   |   |-- core/
|   |   |   |-- auth_guard.py           # Role-based dependency injection
|   |   |   |-- config.py               # Global application settings
|   |   |   |-- database.py             # Database engine and session factory
|   |   |   |-- security.py             # JWT issuance and SHA-256 hash chaining
|   |   |-- models/
|   |   |   |-- entities.py             # Relational 3NF database models
|   |   |-- schemas/
|   |   |   |-- admission.py            # Pydantic request and response schemas
|   |   |-- services/
|   |   |   |-- analytics_service.py    # National macro metrics and heatmaps
|   |   |   |-- apaar_validator.py      # Verhoeff check and syntax validator
|   |   |   |-- duplicate_detector.py   # TF-IDF fuzzy demographic matcher
|   |   |   |-- ingestion_parser.py     # Excel/CSV parser and dry-run validator
|   |   |   |-- ingestion_service.py    # Database transaction manager
|   |   |   |-- regulatory_engine.py    # APH 2024-27 statutory quota engine
|   |   |   |-- student_repository_service.py # State ledger and lifecycle queries
|   |   |   |-- verification_audit_engine.py  # DPDP consent and SHA-256 chain auditor
|   |   |-- main.py                     # FastAPI application endpoints
|   |-- tests/
|   |   |-- test_auth_rbac.py
|   |   |-- test_modules_1_to_5.py
|   |   |-- test_slice1_ingestion.py
|   |   |-- test_slice2_compliance_disputes.py
|   |   |-- test_slice3_analytics_repository.py
|   |   |-- test_slice4_dpdp_audit.py
|   |-- requirements.txt
|
|-- frontend/
|   |-- src/
|   |   |-- app/
|   |   |   |-- layout.tsx              # Root HTML wrapper with AuthProvider
|   |   |   |-- page.tsx                # Main portal view and tab orchestrator
|   |   |-- components/
|   |   |   |-- anomalies/              # TF-IDF anomaly detector UI
|   |   |   |-- audit/                  # SHA-256 cryptographic ledger viewer
|   |   |   |-- auth/                   # Login, register, and demo role switcher
|   |   |   |-- compliance/             # APH 2024-27 quota evaluation UI
|   |   |   |-- disputes/               # Show-cause notice and officer review
|   |   |   |-- institutions/           # Approved capacity vs enrolled roster
|   |   |   |-- overview/               # National KPI cards and regional heatmap
|   |   |   |-- repository/             # Central student ledger and status transitions
|   |   |   |-- sidebar/                # Sticky vertical navigation with role filtering
|   |   |   |-- student/                # APAAR ID card and DPDP consent toggle
|   |   |   |-- upload/                 # Excel/CSV student batch uploader
|   |   |   |-- validator/              # Interactive APAAR ID Verhoeff validator
|   |   |   |-- verifier/               # Corporate verification suite
|   |   |-- context/
|   |   |   |-- AuthContext.tsx         # User authentication state provider
|   |   |-- types/
|   |   |   |-- index.ts                # TypeScript data interfaces
|   |-- package.json
|   |-- tailwind.config.ts
|
|-- docs/
|   |-- api_documentation.md            # Complete REST API specifications
|   |-- database_schema.md              # 3NF relational schema and dictionary
|   |-- modules.md                      # Detailed sub-feature requirements
|   |-- slice_1_documentation.md        # Slice 1 completion report
|   |-- slice_2_documentation.md        # Slice 2 completion report
|   |-- slice_3_documentation.md        # Slice 3 completion report
|   |-- slice_4_documentation.md        # Slice 4 completion report
|   |-- ui_ux_requirements.md           # Government aesthetic design specifications
|   |-- workflow_and_architecture.md    # System workflows and sequence diagrams
|-- README.md
```

---

## 6. Installation and Setup Instructions

### Prerequisites
- Python 3.10 or higher
- Node.js 18.x or higher and npm
- Git

### Backend Setup
1. Open a terminal in the project root directory and navigate to the backend folder:
   ```bash
   cd backend
   ```
2. Create and activate a Python virtual environment:
   - On Windows:
     ```bash
     python -m venv venv
     .\venv\Scripts\activate
     ```
   - On Linux/macOS:
     ```bash
     python3 -m venv venv
     source venv/bin/activate
     ```
3. Install required Python packages:
   ```bash
   pip install --upgrade pip
   pip install -r requirements.txt
   ```
4. Run the automated test suite to verify all 20 tests pass:
   ```bash
   pytest tests
   ```
5. Start the FastAPI development server:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```
   The interactive API documentation (Swagger UI) is available at:
   `http://localhost:8000/api/v1/docs`

### Frontend Setup
1. In a separate terminal, navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install npm dependencies:
   ```bash
   npm install
   ```
3. Run the production build check:
   ```bash
   npm run build
   ```
4. Start the Next.js development server:
   ```bash
   npm run dev
   ```
   Access the web application at:
   `http://localhost:3000`

---

## 7. Automated Test Suite Summary

The backend includes a comprehensive automated test suite verifying all 12 modules:

- `test_auth_rbac.py` (2 tests):
  - User registration, password hashing, valid login, and invalid credential handling.
- `test_modules_1_to_5.py` (4 tests):
  - Verhoeff checksum algorithm, APAAR format validation, single student enrolment.
- `test_slice1_ingestion.py` (3 tests):
  - Ingestion template generation, Excel batch parsing, critical error rollback.
- `test_slice2_compliance_disputes.py` (3 tests):
  - APH 2024-27 quota cap evaluation (NRI 5%, FN 15%, TFW 5%), regulatory case lifecycle.
- `test_slice3_analytics_repository.py` (5 tests):
  - Macro KPI calculations, regional heatmaps, institutional risk index, student repository queries, state transitions.
- `test_slice4_dpdp_audit.py` (3 tests):
  - DPDP consent granting and revocation, verifier signature tokens, SHA-256 chain recalculation.

Total Test Execution Result: 20 passed in under 4 seconds.

---

## 8. Disclaimer

This platform was developed as an official entry for the Smart India Hackathon 2026. All sample institution names, student records, and approval numbers used in mock demonstrations are synthetic and generated for demonstration and testing purposes only.
