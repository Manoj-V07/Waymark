import io
import pandas as pd
from typing import List, Dict, Any, Tuple
from app.services.apaar_validator import APAARValidator

# Standard Columns expected in the AICTE Student Admission Dataset
MANDATORY_COLUMNS = [
    "apaar_id",
    "full_name",
    "dob",
    "gender",
    "roll_number_institutional",
    "seat_category",
    "admission_channel"
]

OPTIONAL_COLUMNS = [
    "email",
    "university_reg_number",
    "aicte_enrolment_number",
    "allotment_order_ref",
    "annual_family_income"
]

VALID_SEAT_CATEGORIES = [
    "REGULAR_MERIT",
    "MANAGEMENT",
    "NRI",
    "FN",
    "OCI",
    "CIWG",
    "TFW",
    "PM_USPY",
    "LATERAL_ENTRY"
]

class IngestionParser:
    """
    Parses, validates, and stages bulk Excel/CSV student admission uploads.
    Supports dry-run validation, row-by-row error reporting, and APAAR format checks.
    """

    @classmethod
    def generate_template_dataframe(cls) -> pd.DataFrame:
        """Generates a standardized Pandas DataFrame template with sample compliant rows."""
        sample_data = [
            {
                "apaar_id": "123456789012",
                "full_name": "Aarav Rajesh Patil",
                "dob": "2005-08-14",
                "gender": "MALE",
                "email": "aarav.patil@example.com",
                "roll_number_institutional": "2026-BTECH-CS-001",
                "university_reg_number": "SPPU-2026-001",
                "aicte_enrolment_number": "",
                "seat_category": "REGULAR_MERIT",
                "admission_channel": "CENTRAL_COUNSELLING",
                "allotment_order_ref": "CAP-MH-2026-001",
                "annual_family_income": 450000
            },
            {
                "apaar_id": "987654321098",
                "full_name": "Diya Suresh Nair",
                "dob": "2005-11-20",
                "gender": "FEMALE",
                "email": "diya.nair@example.com",
                "roll_number_institutional": "2026-BTECH-CS-002",
                "university_reg_number": "SPPU-2026-002",
                "aicte_enrolment_number": "",
                "seat_category": "TFW",
                "admission_channel": "CENTRAL_COUNSELLING",
                "allotment_order_ref": "CAP-MH-2026-002",
                "annual_family_income": 380000
            },
            {
                "apaar_id": "", # Demonstrates PENDING_APAAR provisional admission
                "full_name": "Tariq Ahmad Bhat",
                "dob": "2004-03-12",
                "gender": "MALE",
                "email": "tariq.bhat@example.com",
                "roll_number_institutional": "2026-BTECH-CS-003",
                "university_reg_number": "SPPU-2026-003",
                "aicte_enrolment_number": "",
                "seat_category": "PM_USPY",
                "admission_channel": "SUPERNUMERARY_DIRECT",
                "allotment_order_ref": "PMSSS-2026-9901",
                "annual_family_income": 200000
            }
        ]
        return pd.DataFrame(sample_data)

    @classmethod
    def parse_file_contents(cls, file_bytes: bytes, filename: str) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        """
        Parses raw file bytes into parsed candidate rows and format validation flags.
        Returns: (parsed_records, parsing_flags)
        """
        try:
            if filename.endswith(".csv"):
                df = pd.read_csv(io.BytesIO(file_bytes), dtype=str).fillna("")
            elif filename.endswith((".xlsx", ".xls")):
                df = pd.read_excel(io.BytesIO(file_bytes), dtype=str).fillna("")
            else:
                return [], [{
                    "row_number": 0,
                    "rule_code": "RULE_UNSUPPORTED_FILE_TYPE",
                    "severity": "CRITICAL",
                    "violation_message": "Unsupported file format. Please upload .xlsx or .csv"
                }]
        except Exception as e:
            return [], [{
                "row_number": 0,
                "rule_code": "RULE_FILE_CORRUPTED",
                "severity": "CRITICAL",
                "violation_message": f"Unable to parse file: {str(e)}"
            }]

        # Verify Mandatory Columns
        missing_cols = [col for col in MANDATORY_COLUMNS if col not in df.columns]
        if missing_cols:
            return [], [{
                "row_number": 0,
                "rule_code": "RULE_MISSING_MANDATORY_COLUMNS",
                "severity": "CRITICAL",
                "violation_message": f"Missing required columns in template: {', '.join(missing_cols)}"
            }]

        parsed_records: List[Dict[str, Any]] = []
        flags: List[Dict[str, Any]] = []
        seen_apaar_in_batch: Dict[str, int] = {}
        seen_roll_in_batch: Dict[str, int] = {}

        for idx, row in df.iterrows():
            row_num = idx + 2 # Accounting for 1-based index and header row
            raw_apaar = str(row["apaar_id"]).strip()
            name = str(row["full_name"]).strip()
            dob = str(row["dob"]).strip()
            gender = str(row["gender"]).strip().upper()
            roll_no = str(row["roll_number_institutional"]).strip()
            seat_cat = str(row["seat_category"]).strip().upper()
            channel = str(row["admission_channel"]).strip().upper()

            # 1. Basic demographic completeness
            if not name:
                flags.append({
                    "row_number": row_num,
                    "rule_code": "RULE_MISSING_NAME",
                    "severity": "CRITICAL",
                    "violation_message": "Candidate Full Name cannot be empty."
                })
            if not dob:
                flags.append({
                    "row_number": row_num,
                    "rule_code": "RULE_MISSING_DOB",
                    "severity": "CRITICAL",
                    "violation_message": "Candidate Date of Birth cannot be empty."
                })
            if not roll_no:
                flags.append({
                    "row_number": row_num,
                    "rule_code": "RULE_MISSING_ROLL_NUMBER",
                    "severity": "CRITICAL",
                    "violation_message": "Institutional Roll Number is mandatory."
                })

            # Check intra-batch duplicate roll number
            if roll_no in seen_roll_in_batch:
                flags.append({
                    "row_number": row_num,
                    "rule_code": "RULE_DUPLICATE_ROLL_IN_BATCH",
                    "severity": "CRITICAL",
                    "violation_message": f"Roll number '{roll_no}' repeats at row {seen_roll_in_batch[roll_no]} and {row_num}."
                })
            else:
                seen_roll_in_batch[roll_no] = row_num

            # 2. APAAR ID Validation
            apaar_status = "PENDING_APAAR"
            clean_apaar = ""
            if not raw_apaar:
                flags.append({
                    "row_number": row_num,
                    "rule_code": "RULE_APAAR_NOT_PROVIDED",
                    "severity": "WARNING",
                    "violation_message": "APAAR ID missing. Student registered provisionally as PENDING_APAAR."
                })
            else:
                is_valid_format, clean_or_err = APAARValidator.validate_format(raw_apaar)
                if not is_valid_format:
                    flags.append({
                        "row_number": row_num,
                        "rule_code": "RULE_INVALID_APAAR_FORMAT",
                        "severity": "CRITICAL",
                        "violation_message": f"Invalid APAAR syntax: {clean_or_err}"
                    })
                else:
                    clean_apaar = clean_or_err
                    # Intra-batch duplicate APAAR check
                    if clean_apaar in seen_apaar_in_batch:
                        flags.append({
                            "row_number": row_num,
                            "rule_code": "RULE_DUPLICATE_APAAR_IN_BATCH",
                            "severity": "CRITICAL",
                            "violation_message": f"APAAR ID '{clean_apaar}' appears multiple times (rows {seen_apaar_in_batch[clean_apaar]} and {row_num})."
                        })
                    else:
                        seen_apaar_in_batch[clean_apaar] = row_num
                        apaar_status = "VERIFIED"

            # 3. Category Validation
            if seat_cat not in VALID_SEAT_CATEGORIES:
                flags.append({
                    "row_number": row_num,
                    "rule_code": "RULE_INVALID_SEAT_CATEGORY",
                    "severity": "WARNING",
                    "violation_message": f"Unknown category '{seat_cat}'. Defaulted to REGULAR_MERIT."
                })
                seat_cat = "REGULAR_MERIT"

            parsed_records.append({
                "row_number": row_num,
                "apaar_id": clean_apaar,
                "apaar_status": apaar_status,
                "full_name": name,
                "dob": dob,
                "gender": gender or "OTHER",
                "email": str(row.get("email", "")).strip(),
                "roll_number_institutional": roll_no,
                "university_reg_number": str(row.get("university_reg_number", "")).strip(),
                "aicte_enrolment_number": str(row.get("aicte_enrolment_number", "")).strip(),
                "seat_category": seat_cat,
                "admission_channel": channel or "INSTITUTE_LEVEL",
                "allotment_order_ref": str(row.get("allotment_order_ref", "")).strip(),
                "annual_family_income": float(row.get("annual_family_income", 0) or 0)
            })

        return parsed_records, flags

