"""RMT — Rancangan Makanan Tambahan (free school-meal programme).

The Ministry of Education's Rancangan Makanan Tambahan provides free
breakfast at school to B40 primary-school students (Year 1–6, roughly age
6–12). Administered through each school's RMT committee; no central
application — eligible students are identified by the school after the
parent declares income.

Eligibility (Layak's proxy):
    `income_band` in any B40 tier AND at least one `dependants[*]` with
    `relationship == "child"` AND `age` in [PRIMARY_AGE_MIN,
    PRIMARY_AGE_MAX]. The official program uses the DOSM National Poverty
    Line Income (PGK ~RM2,705/month per DOSM 2024 Poverty in Malaysia
    release) OR eKasih registration OR Orang Asli / special-needs school
    enrolment; Layak's B40-band proxy captures the bottom-half of the
    income distribution and the school re-verifies the exact PGK cutoff
    at intake.

Benefits (non-cash, surfaced as `subsidy_credit`):
    Free school breakfast on ~190 school days per year. Layak does not
    sum this into the headline upside because (a) it is a meal, not cash,
    and (b) each school's value-per-meal differs. The card surfaces
    eligibility and the parent's next step (talk to the school's RMT
    committee).
"""

from __future__ import annotations

from app.rules._i18n import out_of_scope_reason, scheme_copy
from app.schema.locale import DEFAULT_LANGUAGE, SupportedLanguage
from app.schema.profile import Profile
from app.schema.scheme import RuleCitation, SchemeMatch

PRIMARY_AGE_MIN = 6
PRIMARY_AGE_MAX = 12
_B40_BANDS = ("b40_hardcore", "b40_household", "b40_household_with_children")

_SCHEME_ID = "rmt"
_SCHEME_NAME = "RMT — Rancangan Makanan Tambahan (free school meals)"
_AGENCY = "KPM (Ministry of Education Malaysia)"
_PORTAL_URL = "https://www.moe.gov.my/rancangan-makanan-tambahan"
_SOURCE_PDF = "rmt-circular.pdf"


def _citations() -> list[RuleCitation]:
    return [
        RuleCitation(
            rule_id="rmt.programme_overview",
            source_pdf=_SOURCE_PDF,
            page_ref="Portal Manfaat MOF (Budget 2026) — RMT",
            passage=(
                "Rancangan Makanan Tambahan (RMT) provides a daily free school "
                "meal to primary-school pupils (Year 1–6) from households "
                "below the current National Poverty Line Income (~RM2,705/month "
                "per DOSM 2024) or registered under eKasih, identified by the "
                "school's RMT committee. Menu expanded from 20 to 33 options "
                "for the 2026 academic year."
            ),
            source_url="https://manfaat.mof.gov.my/b2026/individu/rmt",
        ),
        RuleCitation(
            rule_id="rmt.target_cohort",
            source_pdf=_SOURCE_PDF,
            page_ref="MOE Bahagian Pengurusan Sekolah Harian (external reference)",
            passage=(
                "Eligibility is needs-based: pupils from low-income households "
                "(below the National PGK), eKasih-registered families, single-"
                "parent families, Orang Asli / Penan school enrolment, or "
                "families facing temporary financial hardship are prioritised. "
                "Per-meal funding RM3.50/student (Peninsular) or RM4.00 "
                "(Sabah / Sarawak / Labuan), up to 190 school days/year."
            ),
            source_url="https://www.moe.gov.my/rancangan-makanan-tambahan",
        ),
    ]


def match(
    profile: Profile,
    *,
    language: SupportedLanguage = DEFAULT_LANGUAGE,
) -> SchemeMatch:
    cites = _citations()
    band = profile.household_flags.income_band
    in_b40 = band in _B40_BANDS
    primary_children = [
        d
        for d in profile.dependants
        if d.relationship == "child" and PRIMARY_AGE_MIN <= d.age <= PRIMARY_AGE_MAX
    ]
    qualifies = in_b40 and bool(primary_children)

    if not qualifies:
        reasons: list[str] = []
        if not in_b40:
            reasons.append(
                out_of_scope_reason(
                    "rmt_band_above_b40",
                    language,
                    band=band,
                )
            )
        if not primary_children:
            reasons.append(
                out_of_scope_reason(
                    "rmt_no_primary_child",
                    language,
                    min_age=PRIMARY_AGE_MIN,
                    max_age=PRIMARY_AGE_MAX,
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

    child_count = len(primary_children)
    copy = scheme_copy(
        _SCHEME_ID,
        "qualify",
        language,
        child_count=child_count,
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
