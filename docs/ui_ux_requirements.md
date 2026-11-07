# UI/UX Requirements: Waymark APAAR Hub
**Design Theme:** Professional, Clean, Accessible Light Background  
**Primary Typography:** Inter / Plus Jakarta Sans (Modern Indian Administrative Standard)  
**WCAG Standard:** Level AA Compliant  

---

## 1. Design System & Light Aesthetic Palette

To deliver a trusted, institutional, and government-grade experience that remains modern and effortless to navigate, the UI is built strictly with a **high-contrast, light-mode background philosophy**.

### 1.1 Color Palette Specifications
| Token Name | Hex Code | Role & Usage |
|---|---|---|
| **Canvas Background** | `#F8FAFC` | Primary window background (Slate 50) |
| **Card / Surface Canvas**| `#FFFFFF` | Elevated white card background with subtle border |
| **Border / Divider** | `#E2E8F0` | Structural dividing lines (Slate 200) |
| **Primary Brand (National Deep Navy)** | `#1E3A8A` | Main headers, navigation bars, and primary CTAs (Blue 900) |
| **Secondary Accent (Tricolor Saffron)**| `#EA580C` | Highlights, important status accents, active tabs (Orange 600) |
| **Success / Validated Green** | `#16A34A` | Compliant records, verified APAAR badge (Green 600) |
| **Warning / Review Amber** | `#D97706` | Pending approvals, supernumerary checks (Amber 600) |
| **Critical / Violation Crimson** | `#DC2626` | Excess admissions, duplicate alerts (Red 600) |
| **Text Primary** | `#0F172A` | Primary readability font color (Slate 900) |
| **Text Secondary / Muted** | `#475569` | Secondary captions, timestamps, table column headers (Slate 600) |

---

## 2. Core Screen Layouts & User Journeys

### 2.1 AICTE National Oversight Dashboard (Light Theme)
```
+-------------------------------------------------------------------------------------------------------+
| [ Emblem ] AICTE APAAR HUB   |  National Overview  |  Institutions  |  Disputes  | [ Officer Profile ]|
+-------------------------------------------------------------------------------------------------------+
|  ACADEMIC YEAR: [ 2026-2027 v ]   |   REGION: [ All Regions (National) v ]   |   STATE: [ All v ]    |
+-------------------------------------------------------------------------------------------------------+
|  [ Stat Card 1 ]         [ Stat Card 2 ]         [ Stat Card 3 ]         [ Stat Card 4 ]              |
|  Total Institutions      Total Approved Intake   Actual Enrolment        Active Flags                 |
|  9,840                   3.20 Million            2.84 Million (88.7%)    482 Flagged                  |
|  (90.6% Reported)        (+2.1% YoY)             Verified APAAR: 92.4%   (Requires Review)            |
+-------------------------------------------------------------------------------------------------------+
|  NATIONAL ADMISSION COMPLIANCE HEATMAP                   | INSTITUTIONAL RISK LEADERBOARD              |
|  [ Interactive SVG Map of India with Choropleth ]       | 1. Apex Institute of Tech (UP) - 88.5 Risk  |
|  - Green: <= 100% Intake Admitted                        |    -> 22 excess regular seats, 3 duplicates |
|  - Yellow: 95-100% capacity                             | 2. Modern Engg College (MH) - 74.0 Risk     |
|  - Red: Excess Admissions flagged                        |    -> Exceeded 5% NRI quota by 4 seats       |
|                                                          | [ View All 14 Flagged Institutions -> ]    |
+-------------------------------------------------------------------------------------------------------+
|  RECENT REGULATORY CASES FOR REVIEW                                                                   |
|  ID        Institution                  Programme       Violation Code       Excess   Action          |
|  RC-104    Kaveri Valley College, KA    B.Tech (CSE)    APH Clause 7.4(g)    +6       [ Open Case ]   |
|  RC-105    St. Jude Technical Inst, KL  B.Tech (Mech)   APH Clause 2.8(b)    +2 NRI   [ Open Case ]   |
+-------------------------------------------------------------------------------------------------------+
```

---

### 2.2 Institution Nodal Officer: Student Data Upload & Pre-Flight Validator
The central interface for uploading batches and resolving errors before submitting to AICTE.
```
+-------------------------------------------------------------------------------------------------------+
|  COLLEGE OF ENGINEERING PUNE (PID: 1-10293847) | Nodal Officer Dashboard | [ Year: 2026-27 ]          |
+-------------------------------------------------------------------------------------------------------+
|  PROGRAMME: [ B.Tech Computer Engineering v ]                                                         |
|  Approved Intake: 120  |  NRI Limit (5%): 6  |  FN/OCI Limit (15%): 18  |  TFW Limit (5%): 6          |
+-------------------------------------------------------------------------------------------------------+
|  STEP 1: UPLOAD DATASET                     |  STEP 2: PRE-FLIGHT VALIDATION ENGINE                   |
|  +---------------------------------------+  |  Total Records Parsed: 130                              |
|  |   [ Drag & Drop .xlsx / .csv Here ]   |  |  Format Valid: 130/130                                  |
|  |   or [ Browse Local Files ]           |  |  APAAR Verified: 124                                    |
|  |   (Standard AICTE Template v2026.1)   |  |  Pending APAAR: 6 (Provisional admitted)                |
|  +---------------------------------------+  |  Cross-College Duplicates: 1 (Alerted)                  |
|  [ ] Run as Dry-Run (No official record) |  |  Intake Status: 130 / 148 Allowed (COMPLIANT)           |
+-------------------------------------------------------------------------------------------------------+
|  ISSUES REQUIRING ATTENTION (1 Flag Found)                                                            |
|  Row  Student Name       APAAR ID       Rule Violated       Severity   Action Required                |
|  42   Siddharth M.       992144321098   Cross-Duplicate     CRITICAL   Student active in VJTI Mumbai  |
|                                                                        [ Upload No-Objection / N.O.C ]|
|                                                                                                       |
|  [ Download Error Log (.xlsx) ]                       [ CANCEL ]   [ CONFIRM & COMMIT TO AICTE ]      |
+-------------------------------------------------------------------------------------------------------+
```

---

### 2.3 Student Academic Identity & Consent Management Portal
Clean mobile-responsive dashboard empowering students under the DPDP Act.
```
+-------------------------------------------------------------------------------------------------------+
|  WAYMARK APAAR ID: 1234 5678 9012  [ Verified Badge ]   |   Student: Aarav Patil   |   [ Logout ] |
+-------------------------------------------------------------------------------------------------------+
|  CURRENT ACTIVE ENROLMENT                                                                             |
|  Institution: College of Engineering Pune (COEP)                                                      |
|  Degree: Bachelor of Technology (B.Tech) - Computer Engineering (2026 - 2030)                         |
|  Admission Category: Tuition Fee Waiver (TFW) | University Reg: SPPU-2026-9921                        |
+-------------------------------------------------------------------------------------------------------+
|  PENDING VERIFICATION REQUESTS                                                                        |
|  Requester: Tata Consultancy Services (TCS Campus Recruitment)                                        |
|  Purpose: Pre-Employment Academic Credential Verification                                             |
|  Requested Data Fields:                                                                               |
|    [X] Full Name & Student Photo      [X] Institution & Course Name                                  |
|    [X] Current Enrolment Status       [ ] Family Income & Quota (Hidden by Student)                   |
|                                                                                                       |
|  Consent Validity: [ 7 Days v ]                                                                       |
|  [ REJECT REQUEST ]                                          [ APPROVE WITH SELECTED SCOPE ]          |
+-------------------------------------------------------------------------------------------------------+
|  ACTIVE CONSENT LOG (Past 30 Days)                                                                    |
|  - Infosys Ltd | Granted on 02-Nov-2026 | Purpose: Internship Verification | Status: ACTIVE (Expires in 2d)|
|  - State Scholarship Portal | Granted on 15-Oct-2026 | Status: EXPIRED                                 |
+-------------------------------------------------------------------------------------------------------+
```

---

### 2.4 External Verifier Result & Cryptographic Certificate
Publicly accessible verification page with digital signatures and QR verification.
```
+-------------------------------------------------------------------------------------------------------+
|  [ Emblem ] AICTE OFFICIAL ACADEMIC CREDENTIAL VERIFICATION                                           |
+-------------------------------------------------------------------------------------------------------+
|  STATUS: OFFICIALLY VERIFIED & AUTHENTIC                                                             |
|  Timestamp: 07-Nov-2026 21:05:14 IST  |  Verification Ref: V-AICTE-2026-981240                        |
+-------------------------------------------------------------------------------------------------------+
|  VERIFIED STUDENT PARTICULARS                                                                         |
|  Academic Identity: APAAR ID (Masked):  XXXX-XXXX-9012                                                |
|  Candidate Name:                        Aarav Rajesh Patil                                            |
|  Enrolled Institution:                  College of Engineering Pune                                   |
|  Programme of Study:                    B.Tech - Computer Engineering                                 |
|  Current Academic Status:               Active Enrolled (First Year)                                  |
|  Admission Session:                     2026-2027                                                     |
+-------------------------------------------------------------------------------------------------------+
|  CRYPTOGRAPHIC PROOF & INTEGRITY                                                                      |
|  Digital Signature:  SHA-256 with ECDSA (AICTE Regulation Bureau Key #4)                              |
|  Audit Ledger Block: #94,821 (SHA-256 Verified)                                                       |
|                                                                                                       |
|      +---------------------+                                                                          |
|      |  [ QR Code Image ]  |  Scan QR to verify on independent mobile device                           |
|      |   Point phone to    |                                                                          |
|      |   verify signature  |                                                                          |
|      +---------------------+                                                                          |
|                                                                                                       |
|  [ Download Official Verification Slip (PDF) ]                                                        |
+-------------------------------------------------------------------------------------------------------+
```

---

## 3. Micro-Interactions & Usability Guidelines

1. **Explainable Flag Drawer:** Whenever a warning or critical badge is clicked, a slide-out drawer appears displaying:
   - Specific rule formula and APH clause.
   - Exact mathematical breakdown (e.g. $120 \text{ approved} + 6 \text{ supernumerary} = 126 \text{ capacity vs } 132 \text{ admitted}$).
   - Actionable buttons: `Contact Institution`, `Request Exemption Justification`, `Flag for Regional Officer Review`.
2. **Keyboard Accessibility:** Full tab navigation, skip-to-content links, and ARIA labels on all modal drawers and file upload zones.
3. **Responsive Grid:** Fluid CSS Grid layout scaling seamlessly from 1920x1080 desktop monitors to 13-inch laptops and tablet screens used by field inspection teams.

