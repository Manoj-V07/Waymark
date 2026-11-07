from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
import math
from app.models.entities import RegulatoryRule

class RegulatoryRuleEngine:
    """
    AICTE Approval Process Handbook (APH) Dynamic Compliance Engine.
    Fetches configurable parameters directly from the database (regulatory_rules),
    allowing rule percentages, thresholds, and formulas to be updated at runtime.
    """

    @classmethod
    def get_active_rules(cls, db: Optional[Session] = None, academic_year: str = "2026-27") -> Dict[str, Dict[str, Any]]:
        """
        Loads active rules from the database for the given academic year,
        falling back to default statutory APH 2024-27 values if DB is not supplied.
        """
        defaults = {
            "RULE_NRI_QUOTA_CAP": {
                "clause": "Clause 2.8(b) - NRI Quota Cap",
                "max_pct": 5.0,
                "severity": "CRITICAL"
            },
            "RULE_INTAKE_CAP": {
                "clause": "Clause 7.4(g) - Excess Admissions Prohibited",
                "severity": "CRITICAL",
                "penalty_clause": "APH 7.3(g)"
            },
            "RULE_FN_OCI_CIWG_CAP": {
                "clause": "Clause 2.9 - FN/OCI/CIWG Supernumerary Cap",
                "max_pct": 15.0,
                "severity": "CRITICAL"
            },
            "RULE_TFW_CAP": {
                "clause": "Clause 6.42 - TFW Seat Cap",
                "max_pct": 5.0,
                "min_prev_year_fill_pct": 50.0,
                "severity": "WARNING"
            }
        }

        if not db:
            return defaults

        try:
            db_rules = db.query(RegulatoryRule).filter(
                RegulatoryRule.is_active == True,
                RegulatoryRule.effective_from_academic_year <= academic_year
            ).all()

            for rule in db_rules:
                if rule.effective_to_academic_year and rule.effective_to_academic_year < academic_year:
                    continue
                defaults[rule.rule_code] = {
                    "clause": rule.clause_reference,
                    "severity": rule.severity,
                    **(rule.parameters_json or {})
                }
        except Exception:
            pass # Gracefully use defaults if query fails

        return defaults

    @classmethod
    def evaluate_programme_intake(
        cls,
        approved_intake: int,
        enrolled_regular: int,
        enrolled_nri: int,
        enrolled_supernumerary: Dict[str, int],
        has_fn_approval: bool = True,
        has_tfw_approval: bool = True,
        prev_year_fill_pct: float = 85.0,
        db: Optional[Session] = None,
        academic_year: str = "2026-27"
    ) -> Dict[str, Any]:
        """
        Dynamically evaluates intake compliance against the configured rules for the academic year.
        """
        rules = cls.get_active_rules(db=db, academic_year=academic_year)
        flags: List[Dict[str, Any]] = []

        # 1. Configurable NRI Rule
        nri_cfg = rules.get("RULE_NRI_QUOTA_CAP", {})
        nri_pct = nri_cfg.get("max_pct", 5.0)
        nri_cap = math.floor(approved_intake * (nri_pct / 100.0))
        if enrolled_nri > nri_cap:
            flags.append({
                "rule_code": "RULE_NRI_QUOTA_CAP",
                "clause": nri_cfg.get("clause", "Clause 2.8(b) - NRI Quota Cap"),
                "severity": nri_cfg.get("severity", "CRITICAL"),
                "violation_message": f"NRI admissions ({enrolled_nri}) exceed configured {nri_pct}% limit ({nri_cap}).",
                "excess_count": enrolled_nri - nri_cap,
                "recommendation": "Route to Regional Officer for scrutiny of NRI eligibility."
            })

        # 2. Configurable Intake Cap Check
        intake_cfg = rules.get("RULE_INTAKE_CAP", {})
        within_intake_total = enrolled_regular + enrolled_nri
        if within_intake_total > approved_intake:
            excess = within_intake_total - approved_intake
            flags.append({
                "rule_code": "RULE_INTAKE_CAP",
                "clause": intake_cfg.get("clause", "Clause 7.4(g) - Excess Admissions Prohibited"),
                "severity": intake_cfg.get("severity", "CRITICAL"),
                "violation_message": f"Total within-intake admissions ({within_intake_total}) exceed Approved Intake ({approved_intake}).",
                "excess_count": excess,
                "indicative_penalty_clause": "APH 7.3(g) (Indicative 5x Tuition Fee per excess student; decision rests with AICTE Committee)",
                "recommendation": "Flag for Executive Committee review. Issue clarification notice."
            })

        # 3. Configurable FN/OCI/CIWG Supernumerary Check
        fn_cfg = rules.get("RULE_FN_OCI_CIWG_CAP", {})
        fn_pct = fn_cfg.get("max_pct", 15.0)
        fn_enrolled = enrolled_supernumerary.get("FN_OCI_CIWG", 0)
        fn_cap = math.floor(approved_intake * (fn_pct / 100.0)) if has_fn_approval else 0

        if not has_fn_approval and fn_enrolled > 0:
            flags.append({
                "rule_code": "RULE_FN_OCI_UNAPPROVED",
                "clause": fn_cfg.get("clause", "Clause 2.9 - FN/OCI Supernumerary Quota"),
                "severity": "CRITICAL",
                "violation_message": f"Admitted {fn_enrolled} FN/OCI students without valid EoA supernumerary approval.",
                "excess_count": fn_enrolled,
                "recommendation": "Immediate Nodal Officer show-cause notice."
            })
        elif fn_enrolled > fn_cap:
            flags.append({
                "rule_code": "RULE_FN_OCI_CIWG_CAP",
                "clause": fn_cfg.get("clause", "Clause 2.9 - FN/OCI Supernumerary Cap"),
                "severity": fn_cfg.get("severity", "CRITICAL"),
                "violation_message": f"FN/OCI admissions ({fn_enrolled}) exceed {fn_pct}% approved limit ({fn_cap}).",
                "excess_count": fn_enrolled - fn_cap,
                "recommendation": "Officer review of foreign national verification documents."
            })

        # 4. Configurable Tuition Fee Waiver (TFW) Check
        tfw_cfg = rules.get("RULE_TFW_CAP", {})
        tfw_pct = tfw_cfg.get("max_pct", 5.0)
        min_prev_fill = tfw_cfg.get("min_prev_year_fill_pct", 50.0)
        tfw_enrolled = enrolled_supernumerary.get("TFW", 0)
        tfw_cap = math.floor(approved_intake * (tfw_pct / 100.0)) if has_tfw_approval else 0

        if has_tfw_approval and prev_year_fill_pct < min_prev_fill and tfw_enrolled > 0:
            flags.append({
                "rule_code": "RULE_TFW_ELIGIBILITY",
                "clause": tfw_cfg.get("clause", "Clause 6.42 - TFW Course Eligibility"),
                "severity": "WARNING",
                "violation_message": f"TFW seats admitted ({tfw_enrolled}) in course that filled <{min_prev_fill}% intake in previous year.",
                "excess_count": tfw_enrolled,
                "recommendation": "Verify prior year intake records."
            })
        elif tfw_enrolled > tfw_cap:
            flags.append({
                "rule_code": "RULE_TFW_CAP",
                "clause": tfw_cfg.get("clause", "Clause 6.42 - TFW Seat Cap"),
                "severity": tfw_cfg.get("severity", "WARNING"),
                "violation_message": f"TFW admissions ({tfw_enrolled}) exceed {tfw_pct}% limit ({tfw_cap}).",
                "excess_count": tfw_enrolled - tfw_cap,
                "recommendation": "Verify state merit counselling allocation."
            })

        total_allowed_capacity = approved_intake + fn_cap + tfw_cap
        total_active_enrolled = within_intake_total + sum(enrolled_supernumerary.values())

        return {
            "compliant": len([f for f in flags if f["severity"] == "CRITICAL"]) == 0,
            "approved_intake": approved_intake,
            "within_intake_admitted": within_intake_total,
            "supernumerary_admitted": sum(enrolled_supernumerary.values()),
            "total_enrolled": total_active_enrolled,
            "total_allowed_capacity": total_allowed_capacity,
            "rules_applied": list(rules.keys()),
            "flags": flags
        }
