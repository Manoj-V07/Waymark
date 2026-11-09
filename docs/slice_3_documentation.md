# Slice 3: Central Student Repository & National Analytics Dashboards
**Status:** Completed & Verified  
**Covers Modules:** Module 8 (Central Student Repository & State Ledger) & Module 9 (Multi-Stakeholder Dashboards & Analytics)

---

## 1. Executive Summary

Slice 3 operationalizes the **Authoritative Central Student Repository** and **National Multi-Stakeholder Intelligence Dashboards**. It transforms the ingested admission batches and regulatory checks into a queryable, immutable relational ledger and surfaces high-level macroeconomic, regional heat-map, and institutional risk metrics to AICTE directorates and college nodal officers.

---

## 2. Features Created in Slice 3

### 2.1 Authoritative Central Student Repository & State Ledger (Module 8)
- **Central Query Engine:**
  - Multi-parameter search across institutions, programmes, student names, institutional roll numbers, and masked APAAR identifiers.
  - Endpoints:
    - `GET /api/v1/students`: Paginated search with status filtering and identity resolution.
- **Temporal Enrolment Lifecycle Transitions:**
  - Provides institutional registrars and AICTE officers with the ability to transition student states (`ACTIVE` $\rightarrow$ `WITHDRAWN`, `TRANSFERRED`, `SUSPENDED`, `COMPLETED`).
  - **Tamper-Evident SHA-256 Block Creation:** Every state transition calculates a block hash chaining the previous block's SHA-256 hash, actor identity, timestamp, and transition details into the immutable `AuditLog` table.
  - Endpoint:
    - `POST /api/v1/students/{enrolment_id}/transition-status` (secured via RBAC: `AICTE_HQ` and `INSTITUTION_NODAL`).

### 2.2 National Multi-Stakeholder Dashboards & Analytics (Module 9)
- **National Macro Metrics:**
  - Real-time aggregation of active reporting institutions, approved intake vs. enrolled capacity, Verhoeff-verified APAAR saturation %, open show-cause notices, and total indicative penalty exposure.
  - Endpoint: `GET /api/v1/analytics/macro-metrics`
- **Regional Intake Utilization Heat-Map:**
  - Regional Office jurisdiction mapping (WRO, SRO, SWRO, NWRO, NRO, CRO) comparing sanctioned seats against actual enrolments with compliance risk badges (`COMPLIANT`, `MODERATE`, `HIGH_FLAG`).
  - Endpoint: `GET /api/v1/analytics/regional-heatmap`
- **Institutional Compliance Risk Index (0–100):**
  - Automated algorithmic risk index scoring institutions based on active regulatory disputes, intake overages, and unaddressed show-cause notices to prioritize regulatory inspections.
  - Endpoint: `GET /api/v1/analytics/institutional-risk-scores`

### 2.3 Interactive Frontend Workspaces
- **National Overview Dashboard (`OverviewSection.tsx`):**
  - Live KPI cards, regional jurisdiction utilization tables with progress indicators, and institutional risk rankings.
- **Central Student Ledger Workspace (`RepositorySection.tsx`):**
  - Real-time search, status filtering, student identity cards, and an interactive state amendment modal with instant cryptographic audit sealing.

---

## 3. End-to-End Workflow of Slice 3

```mermaid
flowchart TD
    subgraph Client ["Frontend Next.js Workspaces"]
        OV["National Overview Dashboard"]
        REP["Central Student Ledger Workspace"]
        MODAL["Amend State & Transition Modal"]
    end

    subgraph AnalyticsEngine ["Module 9: Analytics & Reporting Service"]
        MACRO["get_national_macro_metrics()"]
        HEATMAP["get_regional_heat_map()"]
        RISK["get_institutional_risk_scoring()"]
    end

    subgraph StateLedger ["Module 8: Student Repository Service"]
        QUERY["query_students() with Filters"]
        TRANS["transition_enrolment_status()"]
        SHA["calculate_sha256_hash() Audit Block"]
    end

    subgraph Storage ["PostgreSQL / Relational Store"]
        DB_STUDENTS[("students & enrolments")]
        DB_APPROVALS[("approvals & seat_approvals")]
        DB_AUDIT[("audit_logs (Immutable Chain)")]
    end

    OV -->|GET /analytics/macro-metrics| MACRO
    OV -->|GET /analytics/regional-heatmap| HEATMAP
    OV -->|GET /analytics/institutional-risk-scores| RISK

    MACRO --> DB_APPROVALS
    MACRO --> DB_STUDENTS
    HEATMAP --> DB_APPROVALS
    RISK --> DB_STUDENTS

    REP -->|GET /students?search=...| QUERY
    QUERY --> DB_STUDENTS

    MODAL -->|POST /students/{id}/transition-status| TRANS
    TRANS -->|Update Status| DB_STUDENTS
    TRANS -->|Append Sealed Block| SHA
    SHA --> DB_AUDIT
```

---

## 4. Verification & Testing Evidence

### 4.1 Automated Backend Test Suite
The Slice 3 test suite ([`test_slice3_analytics_repository.py`](file:///d:/SIH-AICTE-APAAR/backend/tests/test_slice3_analytics_repository.py)) passed 100%:
- `test_module9_national_macro_metrics`: Validates macro calculations, approved capacities, and APAAR saturation percentages.
- `test_module9_regional_heatmap`: Validates regional office grouping, utilization calculation, and jurisdiction auditing.
- `test_module9_institutional_risk_scoring`: Validates institutional risk index ranking (0–100 scale).
- `test_module8_student_repository_query`: Validates full-text demographic search and enrolment joins.
- `test_module8_student_status_transition_with_audit_trail`: Verifies role-gated state amendment and the creation of 64-character SHA-256 cryptographic audit entries.

**Overall Test Results:** All **17/17 tests passing across the entire platform**:
```
collected 17 items
backend/tests/test_auth_rbac.py ..                                       [ 11%]
backend/tests/test_modules_1_to_5.py ....                                [ 35%]
backend/tests/test_slice1_ingestion.py ...                               [ 52%]
backend/tests/test_slice2_compliance_disputes.py ...                     [ 70%]
backend/tests/test_slice3_analytics_repository.py .....                  [100%]
====================== 17 passed in 11.16s ======================
```

### 4.2 Production Build Verification
- Next.js production build (`npm run build`) succeeded with **0 linting and type errors**:
```
Route (app)                              Size     First Load JS
┌ ○ /                                    27.1 kB         114 kB
└ ○ /_not-found                          873 B            88 kB
+ First Load JS shared by all            87.1 kB
○  (Static)  prerendered as static content
```

