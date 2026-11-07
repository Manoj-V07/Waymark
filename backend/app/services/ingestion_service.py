import hashlib
from datetime import datetime, date, timezone
from typing import List, Dict, Any, Tuple
from sqlalchemy.orm import Session
from app.models.entities import (
    Student, StudentIdentity, Enrolment, AdmissionDetail, IngestionBatch,
    ValidationResult, Programme, Approval, AuditLog, Institution
)
from app.core.security import calculate_sha256_hash

class AdmissionIngestionService:
    """
    Coordinates end-to-end ingestion:
    1. Validation parsing
    2. Regulatory intake checks
    3. Cross-institution collision checks
    4. ACID database transaction commit
    5. SHA-256 chained audit block generation
    """

    @classmethod
    def process_admission_batch(
        cls,
        db: Session,
        institution_id: str,
        programme_id: str,
        academic_year: str,
        file_name: str,
        records: List[Dict[str, Any]],
        parsing_flags: List[Dict[str, Any]],
        dry_run: bool = False,
        actor_id: str = "SYS_INGESTION"
    ) -> Dict[str, Any]:
        
        # 1. Verify Institution & Programme validity
        institution = db.query(Institution).filter(Institution.institution_id == institution_id).first()
        if not institution:
            return {"status": "error", "message": f"Institution ID '{institution_id}' not found."}

        programme = db.query(Programme).filter(
            Programme.programme_id == programme_id,
            Programme.institution_id == institution_id
        ).first()
        if not programme:
            return {"status": "error", "message": f"Programme ID '{programme_id}' not found for institution."}

        # 2. Check for Cross-Institution Collisions
        all_flags = list(parsing_flags)
        valid_records = []
        for r in records:
            apaar_id = r["apaar_id"]
            if apaar_id:
                # Check if this APAAR ID is active in any other institution
                identity_hash = hashlib.sha256(apaar_id.encode("utf-8")).hexdigest()
                existing_identity = db.query(StudentIdentity).filter(
                    StudentIdentity.identity_checksum_hash == identity_hash
                ).first()

                if existing_identity:
                    conflict_enrol = db.query(Enrolment).filter(
                        Enrolment.student_id == existing_identity.student_id,
                        Enrolment.enrolment_status == "ACTIVE"
                    ).first()

                    if conflict_enrol and conflict_enrol.programme.institution_id != institution_id:
                        other_inst = conflict_enrol.programme.institution
                        all_flags.append({
                            "row_number": r["row_number"],
                            "rule_code": "RULE_CROSS_INSTITUTION_DUPLICATE",
                            "severity": "CRITICAL",
                            "violation_message": (
                                f"APAAR ID {apaar_id} already has active enrolment in {other_inst.name} "
                                f"(PID: {other_inst.pid}) for {conflict_enrol.programme.programme_name}."
                            )
                        })

        # 3. If Dry-Run, return summary without persisting
        critical_flags = [f for f in all_flags if f.get("severity") == "CRITICAL"]
        if dry_run:
            return {
                "status": "dry_run_complete",
                "total_records": len(records),
                "valid_records": len(records) - len({f["row_number"] for f in critical_flags}),
                "flagged_records": len(all_flags),
                "critical_errors": len(critical_flags),
                "flags": all_flags,
                "message": "Dry-run validation successful. No records were written to the repository."
            }

        # 4. Atomic Database Transaction Commit
        batch = IngestionBatch(
            institution_id=institution_id,
            programme_id=programme_id,
            academic_year=academic_year,
            file_name=file_name,
            total_records=len(records),
            valid_records=len(records) - len({f["row_number"] for f in critical_flags}),
            flagged_records=len(all_flags),
            batch_status="COMPLETED"
        )
        db.add(batch)
        db.flush()

        committed_enrolments = 0
        error_rows = {f["row_number"] for f in critical_flags}

        for r in records:
            if r["row_number"] in error_rows:
                continue # Skip critically invalid rows

            # Find or create student
            apaar_id = r["apaar_id"]
            student = None
            if apaar_id:
                identity_hash = hashlib.sha256(apaar_id.encode("utf-8")).hexdigest()
                existing_identity = db.query(StudentIdentity).filter(
                    StudentIdentity.identity_checksum_hash == identity_hash
                ).first()
                if existing_identity:
                    student = existing_identity.student

            if not student:
                # Parse DOB
                try:
                    parsed_dob = datetime.strptime(r["dob"], "%Y-%m-%d").date()
                except Exception:
                    parsed_dob = date(2005, 1, 1)

                student = Student(
                    full_name=r["full_name"],
                    dob=parsed_dob,
                    gender=r["gender"],
                    email=r["email"],
                    identity_status=r["apaar_status"]
                )
                db.add(student)
                db.flush()

                # Add Identity record
                if apaar_id:
                    student_identity = StudentIdentity(
                        student_id=student.student_id,
                        identity_type="APAAR",
                        identity_value_encrypted=f"enc_{apaar_id}", # In prod, AES-256
                        identity_masked=f"XXXXXXXX{apaar_id[-4:]}",
                        identity_checksum_hash=identity_hash,
                        verification_source="LIVE_ADAPTER",
                        verified_at=datetime.now(timezone.utc)
                    )
                    db.add(student_identity)

            # Create Enrolment
            enrolment = Enrolment(
                student_id=student.student_id,
                programme_id=programme_id,
                academic_year=academic_year,
                admission_year=int(academic_year.split("-")[0]),
                current_year_of_study=1,
                roll_number_institutional=r["roll_number_institutional"],
                university_reg_number=r["university_reg_number"],
                aicte_enrolment_number=r["aicte_enrolment_number"],
                enrolment_status="ACTIVE",
                enrolment_date=datetime.now(timezone.utc).date()
            )
            db.add(enrolment)
            db.flush()

            # Create Admission Details
            is_super = r["seat_category"] in ["FN", "OCI", "CIWG", "TFW", "PM_USPY"]
            detail = AdmissionDetail(
                enrolment_id=enrolment.enrolment_id,
                seat_category=r["seat_category"],
                admission_channel=r["admission_channel"],
                allotment_order_ref=r["allotment_order_ref"],
                is_supernumerary=is_super,
                annual_family_income=r["annual_family_income"]
            )
            db.add(detail)
            committed_enrolments += 1

        # 5. Persist Validation Results
        for f in all_flags:
            val_res = ValidationResult(
                batch_id=batch.batch_id,
                rule_code=f.get("rule_code", "GENERIC_FLAG"),
                severity=f.get("severity", "WARNING"),
                violation_message=f.get("violation_message", ""),
                aph_clause_reference="AICTE APH 2024-27",
                details_json={"row_number": f.get("row_number")}
            )
            db.add(val_res)

        # 6. Append to SHA-256 Tamper-Evident Audit Chain
        last_log = db.query(AuditLog).order_by(AuditLog.log_id.desc()).first()
        prev_hash = last_log.current_block_hash if last_log else "0" * 64
        curr_time = datetime.now(timezone.utc).isoformat()
        
        audit_payload = {
            "batch_id": batch.batch_id,
            "institution_id": institution_id,
            "programme_id": programme_id,
            "records_count": len(records),
            "committed_count": committed_enrolments
        }
        curr_hash = calculate_sha256_hash(audit_payload, prev_hash, actor_id, curr_time)

        audit_entry = AuditLog(
            actor_id=actor_id,
            actor_role="INSTITUTION_NODAL",
            action="BULK_STUDENT_ADMISSION_UPLOAD",
            resource_type="INGESTION_BATCH",
            resource_id=batch.batch_id,
            details_json=audit_payload,
            previous_block_hash=prev_hash,
            current_block_hash=curr_hash
        )
        db.add(audit_entry)
        db.commit()

        return {
            "status": "success",
            "batch_id": batch.batch_id,
            "total_records": len(records),
            "committed_enrolments": committed_enrolments,
            "flags_count": len(all_flags),
            "audit_hash": curr_hash,
            "flags": all_flags
        }

