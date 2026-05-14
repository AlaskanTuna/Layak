"""MySalam — Skim Perlindungan Nasional B40 (free critical-illness cover).

MySalam (also marketed as Skim Insurans Madani) is the Ministry of Finance's
free critical-illness insurance scheme for B40 Malaysians aged 18–65. Fully
government-funded — there is no premium. Auto-enrols STR / BSH / BPR
recipients.

Eligibility (Layak's proxy):
    `age` in [18, 65] AND `household_income_rm <= RM2,000/month` (≈ the
    official RM24,000/year cap). Maps onto our `b40_hardcore` band
    (<RM1,500) and the lower half of `b40_household` (RM1,500-2,500). We
    widen the gate to `income_band in {b40_hardcore, b40_household}` so
    the rule is generous within the B40 cohort; the official portal will
    re-verify the strict RM24K/year cutoff at registration.

Benefits (non-cash, surfaced as `subsidy_credit`):
    - RM8,000 one-off cash on diagnosis of any of 45 listed critical
      illnesses.
    - RM50/day hospital-stay income replacement, up to 14 days/year
      (max RM700/year).
"""

from __future__ import annotations

from app.rules._i18n import out_of_scope_reason, scheme_copy
from app.schema.locale import DEFAULT_LANGUAGE, SupportedLanguage
from app.schema.profile import Profile
from app.schema.scheme import RuleCitation, SchemeMatch

MIN_AGE = 18
MAX_AGE = 65
HOUSEHOLD_INCOME_CAP_RM = 2000.0  # RM24,000 / year official cap, monthly form
ELIGIBLE_BANDS = ("b40_hardcore", "b40_household")
CRITICAL_ILLNESS_LUMP_SUM_RM = 8000.0
HOSPITAL_DAILY_RM = 50.0
HOSPITAL_MAX_DAYS = 14

_SCHEME_ID = "mysalam"
_SCHEME_NAME = "MySalam — Skim Perlindungan Nasional B40"
_AGENCY = "MOF (Ministry of Finance Malaysia)"
_PORTAL_URL = "https://www.mysalam.com.my/"
_SOURCE_PDF = "mysalam-coverage.pdf"


def _citations() -> list[RuleCitation]:
    return [
        RuleCitation(
            rule_id="mysalam.coverage",
            source_pdf=_SOURCE_PDF,
            page_ref="MySalam product page",
            passage=(
                "Eligible Malaysians diagnosed with any of 50 listed critical "
                "illnesses (expanded from 45 in 2026 to include rheumatoid "
                "arthritis + rare diseases) receive a one-time cash payout of "
                "RM8,000; additionally, RM50/day hospital income replacement "
                "is paid for inpatient stays at government hospitals, up to "
                "14 days per year."
            ),
            source_url="https://www.mysalam.com.my/",
        ),
        RuleCitation(
            rule_id="mysalam.continued_2026",
            source_pdf=_SOURCE_PDF,
            page_ref="Dewan Rakyat statement, Nov 2025 (Parlimen via DagangNews)",
            passage=(
                "Malaysian citizens aged 18–65 in B40 households are eligible; "
                "STR / BSH / BPR recipients are auto-enrolled. The scheme has "
                "been formally continued through 2026 (Parlimen statement, "
                "Nov 2025); the claim window for incidents occurring in 2026 "
                "runs through 31 December 2026."
            ),
            source_url="https://www.dagangnews.com/article/terkini/program-mysalam-tetap-diteruskan-pada-tahun-2026-bantu-golongan-b40-parlimen-diberitahu-61568",
        ),
    ]


def match(
    profile: Profile,
    *,
    language: SupportedLanguage = DEFAULT_LANGUAGE,
) -> SchemeMatch:
    cites = _citations()
    of_age = MIN_AGE <= profile.age <= MAX_AGE
    band = profile.household_flags.income_band
    in_b40_low = band in ELIGIBLE_BANDS
    qualifies = of_age and in_b40_low

    if not qualifies:
        reasons: list[str] = []
        if not of_age:
            reasons.append(
                out_of_scope_reason(
                    "mysalam_age_outside_window",
                    language,
                    age=profile.age,
                    min_age=MIN_AGE,
                    max_age=MAX_AGE,
                )
            )
        if not in_b40_low:
            reasons.append(
                out_of_scope_reason(
                    "mysalam_band_above_threshold",
                    language,
                    band=band,
                )
            )
        copy = scheme_copy(_SCHEME_ID, "out_of_scope", language, reasons=reasons)
        return SchemeMatch(
            scheme_id=_SCHEME_ID,
            scheme_name=_SCHEME_NAME,
            qualifies=False,
            annual_rm=0.0,
            summary=copy["summary"],
            why_qualify=copy["why_qualify"],
            agency=_AGENCY,
            portal_url=_PORTAL_URL,
            rule_citations=cites,
            kind="subsidy_credit",
        )

    copy = scheme_copy(
        _SCHEME_ID,
        "qualify",
        language,
        age=profile.age,
        lump_sum_rm=CRITICAL_ILLNESS_LUMP_SUM_RM,
        hospital_daily_rm=HOSPITAL_DAILY_RM,
        hospital_max_days=HOSPITAL_MAX_DAYS,
        band=band,
    )
    return SchemeMatch(
        scheme_id=_SCHEME_ID,
        scheme_name=_SCHEME_NAME,
        qualifies=True,
        annual_rm=0.0,
        summary=copy["summary"],
        why_qualify=copy["why_qualify"],
        agency=_AGENCY,
        portal_url=_PORTAL_URL,
        rule_citations=cites,
        kind="subsidy_credit",
    )
