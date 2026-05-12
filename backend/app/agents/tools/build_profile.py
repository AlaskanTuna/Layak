"""Manual-entry Profile builder.

Bypasses the Gemini OCR `extract` step: takes a validated `ManualEntryPayload`
and returns a `Profile` ready for the classify → match → compute_upside →
generate chain. The income-band heuristic below is a pure-Python twin of the
prompt in `backend/app/agents/tools/extract.py:42-47`; if that prompt changes,
this function must change in the same direction or the manual and upload paths
will produce drifting `Profile.household_flags.income_band` values for the
same inputs.

IC handling: the wire carries a full 12-digit `payload.ic` (YYMMDDPPNNNN).
`_parse_ic` splits it into a real `date` (with two-digit-year disambiguation)
plus the 6-digit tail. Only the tail and the derived `age` ever land on the
returned `Profile` — the full IC and DOB exist in request-scope memory only.
"""

from __future__ import annotations

from datetime import date

from app.schema.manual_entry import ManualEntryPayload
from app.schema.profile import Dependant, HouseholdFlags, IncomeBand, Profile


def _classify_income_band(monthly_income_rm: float, has_children_under_18: bool) -> IncomeBand:
    """Twin of the extract prompt bands (extract.py:42-47).

    | band                          | monthly RM      | extra condition              |
    | b40_hardcore                  | < 1,500         | —                            |
    | b40_household                 | 1,500 – 2,500   | —                            |
    | b40_household_with_children   | 2,501 – 5,000   | has_children_under_18=True   |
    | b40_household (fallback)      | 2,501 – 5,000   | no children under 18         |
    | m40                           | 5,001 – 10,000  | —                            |
    | t20                           | > 10,000        | —                            |
    """
    if monthly_income_rm < 1500:
        return "b40_hardcore"
    if monthly_income_rm <= 2500:
        return "b40_household"
    if monthly_income_rm <= 5000:
        return "b40_household_with_children" if has_children_under_18 else "b40_household"
    if monthly_income_rm <= 10000:
        return "m40"
    return "t20"


def derive_household_flags(
    monthly_income_rm: float,
    dependants: list[Dependant],
) -> HouseholdFlags:
    """Pure-Python reimplementation of the extract prompt's household_flags logic."""
    has_children_under_18 = any(d.relationship == "child" and d.age < 18 for d in dependants)
    has_elderly_dependant = any(d.relationship == "parent" and d.age >= 60 for d in dependants)
    return HouseholdFlags(
        has_children_under_18=has_children_under_18,
        has_elderly_dependant=has_elderly_dependant,
        income_band=_classify_income_band(monthly_income_rm, has_children_under_18),
    )


def _age_from_dob(dob: date, today: date | None = None) -> int:
    """Whole years between DOB and today, clamped at 0.

    `today` is injectable for deterministic tests; production callers pass
    `date.today()` implicitly. The MYT timezone assumption is documented in
    the design spec §3.4 — at the single-day granularity of age-in-years,
    the MYT/UTC skew is irrelevant until someone is born or has a birthday
    at exactly midnight MYT, which the rule engine never gates on.
    """
    ref = today if today is not None else date.today()
    years = ref.year - dob.year - ((ref.month, ref.day) < (dob.month, dob.day))
    return max(years, 0)


def _parse_ic(ic: str, today: date | None = None) -> tuple[date, str]:
    """Split a 12-digit Malaysian IC into `(date_of_birth, last_6_digits)`.

    Layout is `YYMMDDPPNNNN`:
      - `YYMMDD` is the date of birth with a two-digit year.
      - `PP` is the place-of-birth code (state for births ≥ 1991, country
        otherwise — the rule engine does not consume this field).
      - `NNNN` is a per-day serial (last digit even = female by convention).

    Two-digit-year disambiguation: we assume the user is between 0 and
    120 years old. If `20YY` interpreted-as-DOB makes the bearer at most
    120 years old AND not born in the future (relative to `today`), we
    pick `20YY`; otherwise we pick `19YY`. This is the same heuristic
    JKM and LHDN portals use when reading a typed-not-scanned IC.

    Raises `ValueError` on impossible dates (e.g. `000231` — Feb 31).
    The Pydantic regex on `ManualEntryPayload.ic` guarantees we receive
    exactly 12 digits, so format validation is upstream.
    """
    if len(ic) != 12 or not ic.isdigit():
        raise ValueError(f"IC must be exactly 12 digits, got {len(ic)}")
    ref = today if today is not None else date.today()
    yy = int(ic[0:2])
    mm = int(ic[2:4])
    dd = int(ic[4:6])
    twenty_first = 2000 + yy
    nineteen_hundred = 1900 + yy
    try:
        candidate_21 = date(twenty_first, mm, dd)
    except ValueError as exc:
        raise ValueError(f"IC YYMMDD {ic[:6]} is not a valid date") from exc
    # `20YY` wins if it produces a non-future birthday for someone aged
    # ≤ 120. Otherwise the bearer was born in `19YY`.
    if candidate_21 <= ref and (ref.year - candidate_21.year) <= 120:
        dob = candidate_21
    else:
        try:
            dob = date(nineteen_hundred, mm, dd)
        except ValueError as exc:
            raise ValueError(f"IC YYMMDD {ic[:6]} is not a valid date") from exc
    return dob, ic[6:]


def build_profile_from_manual_entry(
    payload: ManualEntryPayload,
    *,
    today: date | None = None,
) -> Profile:
    """Deterministic ManualEntryPayload → Profile mapper (no Gemini call)."""
    dependants = [Dependant(**d.model_dump()) for d in payload.dependants]
    dob, ic_last6 = _parse_ic(payload.ic, today=today)
    return Profile(
        # Preserve user casing; AISYAH_PROFILE stores the name in mixed case, and
        # changing the fixture would ripple through the demo UI. Extract still
        # uppercases per its prompt, so the two paths produce names of identical
        # identity-semantics but different presentation — acceptable for v1.
        name=payload.name.strip(),
        ic_last6=ic_last6,
        age=_age_from_dob(dob, today=today),
        monthly_income_rm=payload.monthly_income_rm,
        household_size=1 + len(dependants),
        dependants=dependants,
        household_flags=derive_household_flags(payload.monthly_income_rm, dependants),
        form_type="form_b" if payload.employment_type == "gig" else "form_be",
        address=payload.address,
        monthly_cost_rm=payload.monthly_cost_rm,
        monthly_kwh=payload.monthly_kwh,
    )
