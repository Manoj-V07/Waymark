from typing import List, Dict, Any
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

class DuplicateAnomalyDetector:
    """
    Identifies exact collisions, cross-institution concurrent enrolments,
    and fuzzy demographic near-duplicates using TF-IDF.
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
        threshold: float = 0.85
    ) -> List[Dict[str, Any]]:
        """
        Uses TF-IDF character n-grams to detect near-identical student names
        with identical DOB but different or missing APAAR IDs.
        """
        if len(candidates) < 2:
            return []

        # Build corpus of demographic signatures: "name | dob"
        corpus = [f"{c.get('name', '').lower()} {c.get('dob', '')}" for c in candidates]
        vectorizer = TfidfVectorizer(analyzer="char_wb", ngram_range=(3, 5))
        tfidf_matrix = vectorizer.fit_transform(corpus)
        similarity_matrix = cosine_similarity(tfidf_matrix)

        suspect_pairs = []
        n = len(candidates)
        for i in range(n):
            for j in range(i + 1, n):
                score = similarity_matrix[i, j]
                # If similarity is above threshold and DOBs match
                if score >= threshold and candidates[i].get("dob") == candidates[j].get("dob"):
                    suspect_pairs.append({
                        "rule_code": "RULE_NEAR_DUPLICATE_NAME",
                        "severity": "WARNING",
                        "confidence_score": round(float(score), 3),
                        "candidate_a": candidates[i],
                        "candidate_b": candidates[j],
                        "violation_message": (
                            f"Near-duplicate demographic match ({round(score*100, 1)}%): "
                            f"'{candidates[i].get('name')}' and '{candidates[j].get('name')}' share DOB {candidates[i].get('dob')}."
                        ),
                        "recommendation": "Advisory only. Request institutional nodal officer review."
                    })
        return suspect_pairs

