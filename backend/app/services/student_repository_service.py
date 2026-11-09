from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.models.entities import (
    Enrolment, Student, StudentIdentity, Programme, Institution,
    AdmissionDetail, AuditLog
)
from app.core.security import calculate_sha256_hash

class StudentRepositoryService:
    """
    Module 8: Authoritative Central Student Repository & State Ledger.
    Provides query facilities, temporal state transition management (ACTIVE,
    WITHDRAWN, TRANSFERRED, SUSPENDED, COMPLETED), and immutable audit snapshotting.
    """

    @staticmethod
    def query_students(
        db: Session,
        institution_id: Optional[str] = None,
        programme_id: Optional[str] = None,
        search_query: Optional[str] = None,
        status: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> Dict[str, Any]:
        """Queries students with filters, joins identity details, and pagination."""
        query = (
            db.query(Enrolment, Student, StudentIdentity, Programme, Institution)
            .join(Student, Enrolment.student_id == Student.student_id)
            .outerjoin(StudentIdentity, Student.student_id == StudentIdentity.student_id)
            .join(Programme, Enrolment.programme_id == Programme.programme_id)
            .join(Institution, Programme.institution_id == Institution.institution_id)
        )

        if institution_id:
            query = query.filter(Institution.institution_id == institution_id)
        if programme_id:
            query = query.filter(Programme.programme_id == programme_id)
        if status:
            query = query.filter(Enrolment.enrolment_status == status)
        if search_query:
            pattern = f"%{search_query}%"
            query = query.filter(
                (Student.full_name.ilike(pattern)) |
                (Enrolment.roll_number_institutional.ilike(pattern)) |
                (StudentIdentity.identity_masked.ilike(pattern))
            )

        total_count = query.count()
        results = query.order_by(Enrolment.created_at.desc()).offset(offset).limit(limit).all()

        records = []
        for enrolment, student, identity, programme, institution in results:
            records.append({
                "enrolment_id": enrolment.enrolment_id,
                "student_id": student.student_id,
                "full_name": student.full_name,
                "dob": str(student.dob),
                "gender": student.gender,
                "identity_status": student.identity_status,
                "apaar_masked": identity.identity_masked if identity else "NOT_ASSIGNED",
                "roll_number": enrolment.roll_number_institutional,
                "programme_name": programme.programme_name,
                "level": programme.level,
                "institution_name": institution.name,
                "academic_year": enrolment.academic_year,
                "current_year_of_study": enrolment.current_year_of_study,
                "enrolment_status": enrolment.enrolment_status,
                "enrolment_date": str(enrolment.enrolment_date),
            })

        return {
            "total_count": total_count,
            "limit": limit,
            "offset": offset,
            "records": records,
        }

    @staticmethod
    def transition_enrolment_status(
        db: Session,
        enrolment_id: str,
        new_status: str,
        reason: str,
        actor_id: str = "OFFICER_NODAL"
    ) -> Dict[str, Any]:
        """
        Transitions student enrolment state (e.g. ACTIVE -> WITHDRAWN or TRANSFERRED)
        and seals the transition in the SHA-256 linear audit trail.
        """
        valid_statuses = ["ACTIVE", "WITHDRAWN", "TRANSFERRED", "SUSPENDED", "COMPLETED", "PROVISIONAL"]
        if new_status not in valid_statuses:
            raise ValueError(f"Invalid status '{new_status}'. Must be one of {valid_statuses}")

        enrolment = db.query(Enrolment).filter(Enrolment.enrolment_id == enrolment_id).first()
        if not enrolment:
            raise ValueError(f"Enrolment with ID '{enrolment_id}' not found.")

        old_status = enrolment.enrolment_status
        enrolment.enrolment_status = new_status

        # Append to SHA-256 Audit Log
        last_log = db.query(AuditLog).order_by(AuditLog.log_id.desc()).first()
        prev_hash = last_log.current_block_hash if last_log else "GENESIS_ROOT_HASH_AICTE_2026"

        now_iso = datetime.now(timezone.utc).isoformat()
        payload = {
            "action": "ENROLMENT_STATE_TRANSITION",
            "enrolment_id": enrolment_id,
            "old_status": old_status,
            "new_status": new_status,
            "reason": reason,
        }
        record_hash = calculate_sha256_hash(payload, prev_hash, actor_id, now_iso)

        audit_entry = AuditLog(
            actor_id=actor_id,
            actor_role="INSTITUTION_NODAL_OFFICER",
            action="ENROLMENT_STATE_TRANSITION",
            resource_type="ENROLMENT",
            resource_id=enrolment_id,
            details_json=payload,
            previous_block_hash=prev_hash,
            current_block_hash=record_hash,
        )
        db.add(audit_entry)
        db.commit()

        return {
            "enrolment_id": enrolment_id,
            "previous_status": old_status,
            "current_status": new_status,
            "audit_hash": record_hash,
            "message": f"Student enrolment successfully transitioned to '{new_status}'.",
        }
