# System Workflow and Architecture: Waymark APAAR Hub
**Problem Statement:** SIH 26263  
**System Class:** Distributed Multi-Tenant Regulatory Intelligence Platform  

---

## 1. End-to-End System Workflow

```mermaid
sequenceDiagram
    autonumber
    actor Inst as Institution Nodal Officer
    participant Portal as Web Portal (Frontend)
    participant Ingest as Ingestion API / Worker
    participant APAAR as APAAR / ABC Adapter
    participant RuleEngine as AICTE Regulatory Engine
    participant Repo as Central PostgreSQL Repo
    participant Ledger as SHA-256 Audit Chain
    actor AICTE as AICTE Regulatory Officer
    actor Verifier as Employer / Verifier
    actor Student as Student (DPDP Principal)

    Note over Inst,Portal: Step 1: Admissions Completed & Ingestion
    Inst->>Portal: Upload Student Batch (XLSX/CSV or ERP API)
    Portal->>Ingest: Transmit Batch Payload (Optional Dry-Run)
    
    Note over Ingest,APAAR: Step 2: Identity & Format Verification
    Ingest->>Ingest: Validate 12-digit format & Verhoeff Checksum
    Ingest->>APAAR: Check demographic consistency (Mock/Gov API)
    APAAR-->>Ingest: Return Verification Status (VERIFIED / PENDING)

    Note over Ingest,RuleEngine: Step 3: Regulatory Compliance & Collision Detection
    Ingest->>RuleEngine: Evaluate Admissions vs Approved EoA Intake
    RuleEngine->>RuleEngine: Check NRI <= 5%, FN/OCI <= 15%, TFW <= 5%
    RuleEngine->>RuleEngine: Check Cross-Institution duplicate enrolments
    
    alt Violations or Collisions Detected
        RuleEngine-->>Portal: Return Flagged Warning & Explanation
        RuleEngine->>Repo: Stage Flagged Records (Severity: Warning/Critical)
        RuleEngine->>AICTE: Notify Regional/HQ Officer of Irregularity
    else All Records Compliant
        RuleEngine->>Repo: Commit Active Enrolments (ACID Transaction)
    end

    Note over Repo,Ledger: Step 4: Cryptographic Auditing
    Repo->>Ledger: Append Hash-Chained Block (SHA-256)
    
    Note over AICTE,Repo: Step 5: Live Governance & Monitoring
    AICTE->>Portal: Inspect National Dashboard & Institutional Risk Score
    AICTE->>Inst: Request Show-Cause / Justification for Flagged Records

    Note over Verifier,Student: Step 6: Consent-Based External Verification
    Verifier->>Portal: Submit Verification Request (APAAR ID + Purpose)
    Portal->>Student: Request Granular Consent (Mobile/Web)
    Student-->>Portal: Grant Consent for Specific Scoped Fields
    Portal->>Verifier: Return Cryptographically Signed Verification Slip & QR
```

---

## 2. High-Level System Architecture

The architecture adopts a **Modular Clean Monolith** pattern designed for rapid hackathon execution and linear horizontal scaling:

```mermaid
graph TB
    subgraph Presentation_Layer [Presentation Layer: Next.js 14 / React]
        UI_Admin[AICTE HQ & Regional Dashboard]
        UI_Inst[Institution Portal & Bulk Uploader]
        UI_Student[Student Consent & Wallet]
        UI_Verifier[Public Verification Portal]
    end

    subgraph Gateway_Layer [API Gateway & Security Layer]
        ReverseProxy[Nginx / Cloudflare Reverse Proxy]
        AuthGuard[JWT & Role-Based Access Control - RBAC]
        RateLimiter[Redis Rate Limiter & Security Shields]
    end

    subgraph Application_Core [Application Service Core: FastAPI Python]
        Service_Inst[Institution & EoA Service]
        Service_Student[Student Identity & Enrolment Service]
        Service_Ingest[ETL Ingestion & Parser Service]
        Service_Rule[AICTE APH 2024-27 Regulatory Rule Engine]
        Service_Anomaly[TF-IDF Duplicate & Anomaly Engine]
        Service_Verification[DPDP Consent & Verification Service]
        Service_Audit[Tamper-Proof Audit Chain Service]
    end

    subgraph Integration_Adapters [External Interoperability Layer]
        Adapter_APAAR[APAAR Registry Adapter: Live / Mock]
        Adapter_ABC[Academic Bank of Credits Adapter]
        Adapter_Digi[DigiLocker Credential Adapter]
        Adapter_ERP[Standard Institution ERP REST Adapter]
    end

    subgraph Persistence_Layer [Data & Storage Layer]
        DB_Postgres[(PostgreSQL 16 Relational Master)]
        Cache_Redis[(Redis Cache & Celery Queue)]
        Store_S3[(MinIO / S3 Encrypted Document Store)]
    end

    Presentation_Layer --> ReverseProxy
    ReverseProxy --> AuthGuard
    AuthGuard --> RateLimiter
    RateLimiter --> Application_Core

    Application_Core --> Integration_Adapters
    Application_Core --> Persistence_Layer
    Service_Rule --> DB_Postgres
    Service_Audit --> DB_Postgres
    Service_Ingest --> Cache_Redis
```

---

## 3. Component Details & Design Decisions

### 3.1 Modular Monolith vs Microservices
- **Decision:** Modular Monolith (FastAPI + SQLAlchemy 2.0).
- **Justification:** For SIH and regulatory compliance systems, strong transactional guarantees (ACID) across student records, institutional approvals, and audit logs are paramount. A distributed microservices setup adds network latency, eventual consistency headaches, and distributed transaction complexities without tangible benefits at this stage.

### 3.2 Dual-Tier Validation Architecture
1. **Tier 1 (Fast-Path Synchronous):**
   - Format checks, checksums, null checks, and local file duplicate checks execute synchronously during file parsing ($< 500\text{ ms}$).
2. **Tier 2 (Deep Asynchronous Regulatory Evaluation):**
   - Cross-database duplicate detection, AICTE handbook rule checks, and fuzzy demographic matching run in background worker tasks managed by Celery/Redis.

### 3.3 Cryptographic Trust Framework
- **Tamper-Evident Audit Chain:** Every institutional update, officer exemption, and verification access is hashed into an immutable linear chain:
  $$\text{Block Hash}_i = \text{SHA256}(\text{Record ID} + \text{Payload} + \text{Timestamp} + \text{Actor} + \text{Block Hash}_{i-1})$$
- **Digital Credential Signature:** Verification outputs are signed using ECDSA (Curve P-256) with AICTE's private key, verifiable via public key embedded in the QR code.

