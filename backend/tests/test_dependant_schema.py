"""Regression guard for the `Dependant` schema.

Gemini 2.5 Flash "helpfully" tags each dependant with the given name when
the source document lists one (Farhan's payslip surfaces
"Nurul Hidayah / Adam Hakim / Aleesya Sofea" under Ringkasan Isi Rumah).
The rule engine only reads `relationship` + `age` + `ic_last6`, so the
model is configured with `extra="ignore"` to silently drop anything else
rather than fail the whole extract. This test locks that behaviour in.
"""

from __future__ import annotations

from app.schema.profile import Dependant


def test_dependant_ignores_extra_gemini_fields() -> None:
    dep = Dependant.model_validate(
        {"relationship": "child", "age": 8, "name": "Adam Hakim", "gender": "male"}
    )
    assert dep.relationship == "child"
    assert dep.age == 8
    # Dropped extras don't round-trip on model_dump — the only surface for
    # the pipeline downstream of extract.
    assert "name" not in dep.model_dump()
    assert "gender" not in dep.model_dump()
