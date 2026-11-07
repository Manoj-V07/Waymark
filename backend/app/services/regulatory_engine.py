from typing import Dict, Any, List
import math

class RegulatoryRuleEngine:
    """
    AICTE Approval Process Handbook (APH 2024-25 to 2026-27) Compliance Engine.
    Executes explainable regulatory validation without automatic punitive action.
    """

    @staticmethod
    def evaluate_programme_intake(
        approved_intake: int,
        enrolled_regular: int,
        enrolled_nri: int,
        enrolled_supernumerary: Dict[str, int],
        has_fn_approval: bool = True,
        has_tfw_approval: bool = True,
        prev_year_fill_pct: float = 85.0
    ) -> Dict[str, Any]:
        """
        Evaluates intake compliance with strict pool deconstruction:
        - NRI (APH 2.8b): <= 5% within approved intake.
        - FN/OCI/CIWG (APH 2.9): <= 15% above approved intake (1/3 for CIWG).
        - TFW (APH 6.42): <= 5% supernumerary, requires >= 50% prior year fill.
        """
        flags: List[Dict[str, Any]] = []

        # 1. NRI Seat Rule: within approved intake, max 5%
        nri_cap = math.floor(approved_intake * 0.05)
        if enrolled_nri > nri_cap:
            flags.append({
                "rule_code": "APH_2024_27_RULE_2_8_B",
                "clause": "Clause 2.8(b) - NRI Quota Cap",
                "severity": "CRITICAL",
                "violation_message": f"NRI admissions ({enrolled_nri}) exceed statutory 5% limit ({nri_cap}).",
                "excess_count": enrolled_nri - nri_cap,
                "recommendation": "Route to Regional Officer for scrutiny of merit list."
            })

        # 2. Total within-intake regular pool check (Regular + NRI <= Approved Intake)
        within_intake_total = enrolled_regular + enrolled_nri
        if within_intake_total > approved_intake:
            excess = within_intake_total - approved_intake
            flags.append({
                "rule_code": "APH_2024_27_RULE_7_4_G",
                "clause": "Clause 7.4(g) - Excess Admissions Prohibited",
                "severity": "CRITICAL",
                "violation_message": f"Total within-intake admissions ({within_intake_total}) exceed Approved Intake ({approved_intake}).",
                "excess_count": excess,
                "indicative_penalty_clause": "APH 7.3(g) (Indicative 5x Tuition Fee per excess student; decision rests with AICTE Committee)",
                "recommendation": "Flag for Executive Committee review. Issue clarification notice."
            })

        # 3. FN/OCI/CIWG Supernumerary Check (APH 2.9: max 15%)
        fn_enrolled = enrolled_supernumerary.get("FN_OCI_CIWG", 0)
        fn_cap = math.floor(approved_intake * 0.15) if has_fn_approval else 0
        if not has_fn_approval and fn_enrolled > 0:
            flags.append({
                "rule_code": "APH_2024_27_RULE_2_9_UNAPPROVED",
                "clause": "Clause 2.9 - Unapproved Supernumerary Quota",
                "severity": "CRITICAL",
                "violation_message": f"Admitted {fn_enrolled} FN/OCI students without valid EoA supernumerary approval.",
                "excess_count": fn_enrolled,
                "recommendation": "Immediate Nodal Officer show-cause notice."
            })
        elif fn_enrolled > fn_cap:
            flags.append({
                "rule_code": "APH_2024_27_RULE_2_9_CAP",
                "clause": "Clause 2.9 - FN/OCI/CIWG Supernumerary Cap",
                "severity": "CRITICAL",
                "violation_message": f"FN/OCI admissions ({fn_enrolled}) exceed 15% approved limit ({fn_cap}).",
                "excess_count": fn_enrolled - fn_cap,
                "recommendation": "Officer review of foreign national verification documents."
            })

        # 4. Tuition Fee Waiver Check (APH 6.42: max 5%)
        tfw_enrolled = enrolled_supernumerary.get("TFW", 0)
        tfw_cap = math.floor(approved_intake * 0.05) if has_tfw_approval else 0
        if has_tfw_approval and prev_year_fill_pct < 50.0 and tfw_enrolled > 0:
            flags.append({
                "rule_code": "APH_2024_27_RULE_6_42_ELIGIBILITY",
                "clause": "Clause 6.42 - TFW Course Eligibility",
                "severity": "WARNING",
                "violation_message": f"TFW seats admitted ({tfw_enrolled}) in course that filled <50% intake ({prev_year_fill_pct}%) in previous year.",
                "excess_count": tfw_enrolled,
                "recommendation": "Verify prior year intake records."
            })
        elif tfw_enrolled > tfw_cap:
            flags.append({
                "rule_code": "APH_2024_27_RULE_6_42_CAP",
                "clause": "Clause 6.42 - TFW Seat Cap",
                "severity": "WARNING",
                "violation_message": f"TFW admissions ({tfw_enrolled}) exceed 5% limit ({tfw_cap}).",
                "excess_count": tfw_enrolled - tfw_cap,
                "recommendation": "Verify state merit counselling allocation."
            })

        # Calculate capacity
        total_allowed_capacity = approved_intake + fn_cap + tfw_cap
        total_active_enrolled = within_intake_total + sum(enrolled_supernumerary.values())

        return {
            "compliant": len([f for f in flags if f["severity"] == "CRITICAL"]) == 0,
            "approved_intake": approved_intake,
            "within_intake_admitted": within_intake_total,
            "supernumerary_admitted": sum(enrolled_supernumerary.values()),
            "total_enrolled": total_active_enrolled,
            "total_allowed_capacity": total_allowed_capacity,
            "flags": flags
        }

