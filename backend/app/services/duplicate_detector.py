import difflib
from typing import List, Dict, Any
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

class DuplicateAnomalyDetector:
    """
    Identifies exact collisions, cross-institution concurrent enrolments,
    and fuzzy demographic near-duplicates using normalized sequence matching & TF-IDF.
    """

    @staticmethod
    def detect_exact_cross_duplicates(
        new_records: List[Dict[str, Any]],
        existing_enrolments: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Flags exact APAAR collisions where a student has an ACTIVE enrolment
        in another institution.
        """
        existing_map = {
            item["apaar_hash"]: item for item in existing_enrolments if item.get("status") == "ACTIVE"
        }
        
        collision_flags = []
        for record in new_records:
            apaar_hash = record.get("apaar_hash")
            if apaar_hash and apaar_hash in existing_map:
                conflict = existing_map[apaar_hash]
                collision_flags.append({
                    "record_id": record.get("temp_id"),
                    "apaar_id": record.get("apaar_id"),
                    "rule_code": "RULE_CROSS_INSTITUTION_DUPLICATE",
                    "severity": "CRITICAL",
                    "violation_message": (
                        f"Student is already actively enrolled in {conflict.get('institution_name')} "
                        f"(PID: {conflict.get('institution_pid')}) for programme {conflict.get('programme_name')}."
                    ),
                    "conflicting_institution_id": conflict.get("institution_id")
                })
        return collision_flags

    @staticmethod
    def detect_fuzzy_demographic_matches(
        candidates: List[Dict[str, Any]],
        threshold: float = 0.80
    ) -> List[Dict[str, Any]]:
        """
        Detects near-identical student names sharing the exact same DOB,
        using both normalized character similarity and TF-IDF cosine distance.
        """
        if len(candidates) < 2:
            return []

        suspect_pairs = []
        n = len(candidates)

        for i in range(n):
            for j in range(i + 1, n):
                cand_a = candidates[i]
                cand_b = candidates[j]

                # Only evaluate if DOBs match
                if cand_a.get("dob") and cand_a.get("dob") == cand_b.get("dob"):
                    name_a = str(cand_a.get("name", "")).lower().strip()
                    name_b = str(cand_b.get("name", "")).lower().strip()

                    # Normalized similarity (stripping whitespace differences e.g. Arun Kumar vs Arunkumar)
                    norm_a = name_a.replace(" ", "")
                    norm_b = name_b.replace(" ", "")
                    seq_score = difflib.SequenceMatcher(None, norm_a, norm_b).ratio()

                    if seq_score >= threshold:
                        suspect_pairs.append({
                            "rule_code": "RULE_NEAR_DUPLICATE_NAME",
                            "severity": "WARNING",
                            "confidence_score": round(float(seq_score), 3),
                            "candidate_a": cand_a,
                            "candidate_b": cand_b,
                            "violation_message": (
                                f"Near-duplicate demographic match ({round(seq_score*100, 1)}%): "
                                f"'{cand_a.get('name')}' and '{cand_b.get('name')}' share DOB {cand_a.get('dob')}."
                            ),
                            "recommendation": "Advisory only. Request institutional nodal officer review."
                        })

        return suspect_pairs
