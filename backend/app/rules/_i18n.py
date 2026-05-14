"""Per-rule translations for `SchemeMatch.summary` + `SchemeMatch.why_qualify`.

Every rule module builds the numeric facts (annual_rm, income band, child count,
etc.) and then calls `scheme_copy(scheme_id, variant, language, **vars)` here
to pull the localised string pair. Keeps all translation noise in one file
instead of sprawling `_why_qualify_en` / `_why_qualify_ms` / `_why_qualify_zh`
helpers across seven rule files.

Design choice — pure-Python catalog rather than Gemini translation:
  - Deterministic: no model drift between runs.
  - Zero-latency: the match step stays O(ms).
  - Testable: `test_rule_copy_coverage` asserts every SchemeId × SupportedLanguage
    × variant combination has an entry.

Proper nouns (scheme_name, agency, portal URL) live on the rule modules and
stay in their gov-form-sourced form — they're not localised here.
"""

from __future__ import annotations

from collections.abc import Callable
from typing import Any, Literal, TypedDict

from app.schema.locale import SupportedLanguage
from app.schema.scheme import SchemeId

Variant = Literal["qualify", "out_of_scope"]


class SchemeCopy(TypedDict):
    """Pair of human-readable strings attached to a `SchemeMatch`."""

    summary: str
    why_qualify: str


# ---------------------------------------------------------------------------
# STR 2026 — Sumbangan Tunai Rahmah, household-with-children tier
# ---------------------------------------------------------------------------


def _str_band_label(band: str, language: SupportedLanguage) -> str:
    # The currency + numeric tokens stay ASCII; only the glue prose changes.
    if band == "le_2500":
        return "≤RM2,500"
    return "RM2,501–RM5,000"


def _str_2026_qualify(language: SupportedLanguage, **v: Any) -> SchemeCopy:
    band_label = _str_band_label(v["band"], language)
    bucket_label = v["bucket"].replace("_", "-")
    annual_rm = v["annual_rm"]
    income = v["income"]
    children = v["children"]
    if language == "ms":
        return {
            "summary": (
                f"Tier isi rumah berkanak-kanak, jalur pendapatan {band_label}, "
                f"baldi {bucket_label} anak."
            ),
            "why_qualify": (
                f"Isi rumah anda memperoleh RM{income:,.0f}/bulan, dalam jalur "
                f"{band_label}. Anda mempunyai {children} anak berumur di bawah 18 "
                f"tahun, menempatkan anda dalam baldi anak '{bucket_label}'. STR "
                f"2026 membayar RM{annual_rm:,.0f}/tahun dalam dua ansuran di "
                f"bawah tier isi rumah berkanak-kanak. Anda masih perlu memohon "
                f"menggunakan borang BK-01 di bantuantunai.hasil.gov.my — Layak "
                f"menyediakan draf borang; keputusan muktamad adalah oleh LHDN."
            ),
        }
    if language == "zh":
        return {
            "summary": (
                f"有子女家庭级别，收入区间 {band_label}，子女人数分组 {bucket_label}。"
            ),
            "why_qualify": (
                f"您的家庭月收入为 RM{income:,.0f}，落在 {band_label} 区间内。"
                f"您有 {children} 名未满 18 岁的孩子，对应「{bucket_label}」子女分组。"
                f"STR 2026 在有子女家庭级别下每年分两期共发放 RM{annual_rm:,.0f}。"
                f"您仍需通过 bantuantunai.hasil.gov.my 的 BK-01 表格申请 —— "
                f"Layak 为您准备草稿，最终审批仍由内陆税收局 (LHDN) 决定。"
            ),
        }
    return {
        "summary": (
            f"Household-with-children tier, income band {band_label}, "
            f"{bucket_label} children bucket."
        ),
        "why_qualify": (
            f"Your household earns RM{income:,.0f}/month, inside the {band_label} band. "
            f"You have {children} child(ren) under 18, placing you in the '{bucket_label}' "
            f"children bucket. STR 2026 pays RM{annual_rm:,.0f}/year in two tranches under the "
            f"household-with-children tier. You still apply via BK-01 at "
            f"bantuantunai.hasil.gov.my — Layak drafts the form for you; the final "
            f"determination is LHDN's on application."
        ),
    }


def _str_2026_out_of_scope(language: SupportedLanguage, **v: Any) -> SchemeCopy:
    reasons: list[str] = v["reasons"]
    if language == "ms":
        return {
            "summary": "Tidak layak di bawah tier STR 2026 isi rumah berkanak-kanak.",
            "why_qualify": "Di luar skop: " + "; ".join(reasons) + ".",
        }
    if language == "zh":
        return {
            "summary": "未通过 STR 2026 有子女家庭级别的资格审核。",
            "why_qualify": "不在受惠范围内：" + "；".join(reasons) + "。",
        }
    return {
        "summary": "Does not qualify under STR 2026 household-with-children tier.",
        "why_qualify": "Out of scope: " + "; ".join(reasons) + ".",
    }


# ---------------------------------------------------------------------------
# JKM Warga Emas
# ---------------------------------------------------------------------------


def _jkm_warga_emas_qualify(language: SupportedLanguage, **v: Any) -> SchemeCopy:
    per_capita = v["per_capita"]
    food_pli = v["food_pli_rm"]
    eldest_age = v["eldest_age"]
    monthly_rm = v["monthly_rm"]
    fallback_monthly_rm = v["fallback_monthly_rm"]
    monthly_income = v["monthly_income_rm"]
    household_size = v["household_size"]
    if language == "ms":
        return {
            "summary": (
                f"Pendapatan per kapita RM{per_capita:,.0f}/bulan di bawah PLI "
                f"makanan RM{food_pli:,.0f} — ibu bapa warga emas berumur "
                f"{eldest_age} layak."
            ),
            "why_qualify": (
                f"Isi rumah anda memperoleh RM{monthly_income:,.0f}/bulan untuk "
                f"{household_size} ahli — pendapatan per kapita RM{per_capita:,.0f} "
                f"di bawah ambang PLI makanan DOSM 2024 iaitu RM{food_pli:,.0f}. "
                f"Di bawah Bajet 2026, pembayaran bulanan adalah "
                f"RM{monthly_rm:,.0f} (kadar sandaran RM{fallback_monthly_rm:,.0f} "
                f"jika kenaikan belum digunakan). Anda memohon bagi pihak warga "
                f"emas tanggungan menggunakan borang JKM18."
            ),
        }
    if language == "zh":
        return {
            "summary": (
                f"人均月收入 RM{per_capita:,.0f} 低于食物贫困线 RM{food_pli:,.0f} —— "
                f"年长父母（{eldest_age} 岁）符合资格。"
            ),
            "why_qualify": (
                f"您的家庭月收入为 RM{monthly_income:,.0f}，共 {household_size} 人 —— "
                f"人均月收入 RM{per_capita:,.0f} 低于 2024 年 DOSM 食物贫困线 "
                f"RM{food_pli:,.0f}。根据 2026 年财政预算，每月补贴为 "
                f"RM{monthly_rm:,.0f}（若相关调整尚未生效，则按 "
                f"RM{fallback_monthly_rm:,.0f} 发放）。您需以 JKM18 表格代年长"
                f"受扶养人递交申请。"
            ),
        }
    return {
        "summary": (
            f"Per-capita income RM{per_capita:,.0f}/month is below food-PLI "
            f"RM{food_pli:,.0f} — elderly parent age {eldest_age} qualifies."
        ),
        "why_qualify": (
            f"Your household earns RM{monthly_income:,.0f}/month across "
            f"{household_size} members — per-capita income RM{per_capita:,.0f} is "
            f"below the DOSM 2024 food-PLI threshold of RM{food_pli:,.0f}. Under Budget "
            f"2026 the monthly payment is RM{monthly_rm:,.0f} (fallback "
            f"RM{fallback_monthly_rm:,.0f} where the uplift is pending). You "
            f"apply on behalf of the dependent elder using the JKM18 form."
        ),
    }


def _jkm_warga_emas_out_of_scope(language: SupportedLanguage, **v: Any) -> SchemeCopy:
    reasons: list[str] = v["reasons"]
    if language == "ms":
        return {
            "summary": "Tidak layak di bawah ujian kemampuan JKM Warga Emas.",
            "why_qualify": "Di luar skop: " + "; ".join(reasons) + ".",
        }
    if language == "zh":
        return {
            "summary": "未通过 JKM 乐龄人士的资产审查。",
            "why_qualify": "不在受惠范围内：" + "；".join(reasons) + "。",
        }
    return {
        "summary": "Does not qualify under JKM Warga Emas means test.",
        "why_qualify": "Out of scope: " + "; ".join(reasons) + ".",
    }


# ---------------------------------------------------------------------------
# JKM BKK (Bantuan Kanak-Kanak)
# ---------------------------------------------------------------------------


def _jkm_bkk_qualify(language: SupportedLanguage, **v: Any) -> SchemeCopy:
    per_capita = v["per_capita"]
    threshold = v["threshold_rm"]
    breakdown = v["breakdown"]
    cap_note = v["cap_note"]  # already localised or empty string — see rule
    capped_monthly = v["capped_monthly"]
    annual_rm = v["annual_rm"]
    monthly_income = v["monthly_income_rm"]
    household_size = v["household_size"]
    if language == "ms":
        return {
            "summary": (
                f"Pendapatan per kapita RM{per_capita:,.0f}/bulan pada/di bawah "
                f"ambang BKK RM{threshold:,.0f}; {breakdown} = "
                f"RM{capped_monthly:,.0f}/bulan{cap_note}."
            ),
            "why_qualify": (
                f"Isi rumah anda memperoleh RM{monthly_income:,.0f}/bulan untuk "
                f"{household_size} ahli — pendapatan per kapita RM{per_capita:,.0f} "
                f"pada/di bawah ambang BKK RM{threshold:,.0f}. Mengikut kadar "
                f"Bajet 2021: {breakdown}{cap_note}, pembayaran tahunan adalah "
                f"RM{annual_rm:,.0f}. Mohon melalui Borang Permohonan Bantuan "
                f"Kanak-Kanak di Pejabat Kebajikan Masyarakat Daerah berdekatan."
            ),
        }
    if language == "zh":
        return {
            "summary": (
                f"人均月收入 RM{per_capita:,.0f} 处于 BKK 门槛 RM{threshold:,.0f} 以内；"
                f"{breakdown} = RM{capped_monthly:,.0f}/月{cap_note}。"
            ),
            "why_qualify": (
                f"您的家庭月收入为 RM{monthly_income:,.0f}，共 {household_size} 人 —— "
                f"人均月收入 RM{per_capita:,.0f} 处于 BKK 门槛 RM{threshold:,.0f} 以内。"
                f"按 2021 年财政预算的费率：{breakdown}{cap_note}，年度补助为 "
                f"RM{annual_rm:,.0f}。请至最近的社区福利办事处 (Pejabat Kebajikan "
                f"Masyarakat Daerah) 填写 Borang Permohonan Bantuan Kanak-Kanak 申请。"
            ),
        }
    return {
        "summary": (
            f"Per-capita income RM{per_capita:,.0f}/month is at/under BKK threshold "
            f"RM{threshold:,.0f}; "
            f"{breakdown} = RM{capped_monthly:,.0f}/month{cap_note}."
        ),
        "why_qualify": (
            f"Your household earns RM{monthly_income:,.0f}/month across "
            f"{household_size} members — per-capita income "
            f"RM{per_capita:,.0f} is at/under the BKK threshold of "
            f"RM{threshold:,.0f}. Per current Budget 2021 rates: "
            f"{breakdown}{cap_note}, the annual payment works out to "
            f"RM{annual_rm:,.0f}. Apply via Borang Permohonan Bantuan Kanak-Kanak "
            f"at your nearest Pejabat Kebajikan Masyarakat Daerah."
        ),
    }


def _jkm_bkk_out_of_scope(language: SupportedLanguage, **v: Any) -> SchemeCopy:
    reasons: list[str] = v["reasons"]
    if language == "ms":
        return {
            "summary": "Tidak layak di bawah ujian kemampuan JKM BKK.",
            "why_qualify": "Di luar skop: " + "; ".join(reasons) + ".",
        }
    if language == "zh":
        return {
            "summary": "未通过 JKM BKK 的资产审查。",
            "why_qualify": "不在受惠范围内：" + "；".join(reasons) + "。",
        }
    return {
        "summary": "Does not qualify under JKM BKK means test.",
        "why_qualify": "Out of scope: " + "; ".join(reasons) + ".",
    }


# ---------------------------------------------------------------------------
# LHDN Form B / Form BE (shared five-relief saving rule)
# ---------------------------------------------------------------------------


def _lhdn_qualify(language: SupportedLanguage, **v: Any) -> SchemeCopy:
    form_label = v["form_label"]  # "Form B" or "Form BE" — stays English
    filer_category_en = v["filer_category"]  # "self-employed" | "salaried"
    annual_income = v["annual_income"]
    total_relief = v["total_relief"]
    saving = v["saving"]
    applied = v["applied"]
    deadline = v["deadline"]  # date label in Latin script
    if language == "ms":
        filer_category = "pekerja sendiri" if filer_category_en == "self-employed" else "bergaji"
        return {
            "summary": (
                f"Pelepasan YA2025 berjumlah RM{total_relief:,.0f} dikenakan pada "
                f"pendapatan tahunan RM{annual_income:,.0f}; anggaran penjimatan "
                f"cukai RM{saving:,.0f}."
            ),
            "why_qualify": (
                f"Sebagai pemfail {form_label} ({filer_category}) dengan pendapatan "
                f"tahunan RM{annual_income:,.0f}, pelepasan YA2025 berikut boleh "
                f"ditumpuk: {applied}. Pelepasan ini mengurangkan pendapatan "
                f"bercukai sebanyak RM{total_relief:,.0f} dan bil cukai sebanyak "
                f"RM{saving:,.0f}/tahun. Tarikh akhir fail {form_label} adalah "
                f"{deadline}."
            ),
        }
    if language == "zh":
        filer_category = "自雇" if filer_category_en == "self-employed" else "受薪"
        return {
            "summary": (
                f"对年收入 RM{annual_income:,.0f} 套用 YA2025 各项扣除，合计 "
                f"RM{total_relief:,.0f}，预计可节省税款 RM{saving:,.0f}。"
            ),
            "why_qualify": (
                f"作为年收入 RM{annual_income:,.0f} 的 {form_label}（{filer_category}）"
                f"报税人，以下 YA2025 扣除项可以叠加：{applied}。"
                f"这些扣除能减少应税收入 RM{total_relief:,.0f}，每年省下约 "
                f"RM{saving:,.0f} 的税款。{form_label} 报税截止日期为 {deadline}。"
            ),
        }
    return {
        "summary": (
            f"Applied YA2025 reliefs totalling RM{total_relief:,.0f} against annual "
            f"income RM{annual_income:,.0f}; estimated tax saving RM{saving:,.0f}."
        ),
        "why_qualify": (
            f"As a {form_label} ({filer_category_en}) filer with an annual income of RM{annual_income:,.0f}, "
            f"the following YA2025 reliefs stack: {applied}. Applying them reduces your "
            f"chargeable income by RM{total_relief:,.0f} and your tax bill by "
            f"RM{saving:,.0f}/year. The {form_label} filing deadline is {deadline}."
        ),
    }


def _lhdn_zero_saving(language: SupportedLanguage, **v: Any) -> SchemeCopy:
    total_relief = v["total_relief"]
    annual_income = v["annual_income"]
    if language == "ms":
        return {
            "summary": (
                f"Jumlah pelepasan RM{total_relief:,.0f} sudah melebihi pendapatan "
                f"bercukai — tiada penjimatan cukai tambahan."
            ),
            "why_qualify": (
                f"Di luar skop: pendapatan bercukai tahunan RM{annual_income:,.0f} "
                f"sudah menghasilkan cukai sifar di bawah jadual YA2025 walaupun "
                f"tanpa pelepasan — tiada apa-apa untuk disimpan."
            ),
        }
    if language == "zh":
        return {
            "summary": (
                f"扣除总额 RM{total_relief:,.0f} 已超过应税收入 —— 无额外的节税空间。"
            ),
            "why_qualify": (
                f"不在受惠范围内：按 YA2025 税率表，年度应税收入 "
                f"RM{annual_income:,.0f} 即使未套用任何扣除，本身就已产生零税款 —— "
                f"没有可节省的部分。"
            ),
        }
    return {
        "summary": f"Total relief RM{total_relief:,.0f} already exceeds chargeable income — no further tax saving.",
        "why_qualify": (
            f"Out of scope: annual chargeable income RM{annual_income:,.0f} produces "
            f"zero tax under YA2025 brackets even before reliefs — nothing to save."
        ),
    }


# ---------------------------------------------------------------------------
# i-Saraan (EPF voluntary match)
# ---------------------------------------------------------------------------


def _i_saraan_qualify(language: SupportedLanguage, **v: Any) -> SchemeCopy:
    age = v["age"]
    match_rate_pct = v["match_rate_pct"]
    annual_cap = v["annual_match_cap_rm"]
    min_age = v["min_age"]
    max_age = v["max_age"]
    contribution_for_max = v["annual_contribution_to_max_match_rm"]
    if language == "ms":
        return {
            "summary": (
                f"Pemfail Form B pekerja sendiri berumur {age} layak untuk padanan "
                f"kerajaan i-Saraan {match_rate_pct:.0f}% sehingga "
                f"RM{annual_cap:,.0f}/tahun."
            ),
            "why_qualify": (
                f"Anda adalah pemfail pekerja sendiri (Form B) berumur {age}, "
                f"dalam tetingkap umur i-Saraan {min_age}-{max_age}. Sumbang "
                f"sekurang-kurangnya RM{contribution_for_max:,.2f}/tahun secara "
                f"sukarela ke Akaun EPF anda dan kerajaan akan menambah "
                f"RM{annual_cap:,.0f} penuh — padanan tahunan maksimum. Sumbangan "
                f"yang lebih kecil mendapat padanan "
                f"{match_rate_pct:.0f}% berkadar (contoh: RM1,000 → padanan kerajaan "
                f"RM150). Daftar melalui portal KWSP i-Saraan atau mana-mana cawangan KWSP."
            ),
        }
    if language == "zh":
        return {
            "summary": (
                f"自雇 Form B 报税人，{age} 岁，符合 i-Saraan 政府配比 "
                f"{match_rate_pct:.0f}%，每年上限 RM{annual_cap:,.0f}。"
            ),
            "why_qualify": (
                f"您是 {age} 岁的自雇报税人（Form B），正落在 i-Saraan 的 "
                f"{min_age}-{max_age} 岁区间内。自愿向您的 EPF 账户存入至少 "
                f"RM{contribution_for_max:,.2f}/年，政府便会补齐全额 "
                f"RM{annual_cap:,.0f} —— 每年的最高配比。较小的存款按 "
                f"{match_rate_pct:.0f}% 比例配比（例如存入 RM1,000 —— 政府配比 "
                f"RM150）。请通过 KWSP i-Saraan 网站或任何 KWSP 分行登记。"
            ),
        }
    return {
        "summary": (
            f"Self-employed Form B filer aged {age} qualifies for the i-Saraan "
            f"{match_rate_pct:.0f}% government match up to RM{annual_cap:,.0f}/year."
        ),
        "why_qualify": (
            f"You're a self-employed filer (Form B) aged {age}, within the i-Saraan "
            f"{min_age}-{max_age} age window. Contribute at least RM"
            f"{contribution_for_max:,.2f}/year voluntarily into your EPF Account "
            f"and the government will add the full RM{annual_cap:,.0f} — the maximum "
            f"annual match. Smaller contributions earn a proportional "
            f"{match_rate_pct:.0f}% match (e.g. RM1,000 contributed → RM150 government match). "
            f"Register via the KWSP i-Saraan portal or at any KWSP branch."
        ),
    }


def _i_saraan_out_of_scope(language: SupportedLanguage, **v: Any) -> SchemeCopy:
    reasons: list[str] = v["reasons"]
    if language == "ms":
        return {
            "summary": "Tidak layak di bawah kelayakan EPF i-Saraan.",
            "why_qualify": "Di luar skop: " + "; ".join(reasons) + ".",
        }
    if language == "zh":
        return {
            "summary": "未符合 EPF i-Saraan 资格。",
            "why_qualify": "不在受惠范围内：" + "；".join(reasons) + "。",
        }
    return {
        "summary": "Does not qualify under EPF i-Saraan eligibility.",
        "why_qualify": "Out of scope: " + "; ".join(reasons) + ".",
    }


# ---------------------------------------------------------------------------
# PERKESO SKSPS (required contribution)
# ---------------------------------------------------------------------------


def _perkeso_sksps_qualify(language: SupportedLanguage, **v: Any) -> SchemeCopy:
    plan_label = v["plan_label"]  # e.g. "Plan 1" — stays as-is
    monthly_rm = v["monthly_rm"]
    annual_rm = v["annual_rm"]
    ceiling_note = v["ceiling_note"]  # localised below; passed in pre-formatted
    age = v["age"]
    monthly_income_rm = v["monthly_income_rm"]
    portal_url = v["portal_url"]
    if language == "ms":
        return {
            "summary": (
                f"{plan_label}: RM{monthly_rm:.2f}/bulan → RM{annual_rm:.2f}/tahun "
                f"caruman wajib di bawah Akta 789 {ceiling_note}."
            ),
            "why_qualify": (
                f"Sebagai pemfail pekerja sendiri / gig berumur {age} dengan "
                f"pendapatan bulanan RM{monthly_income_rm:,.2f}, anda tertakluk "
                f"di bawah mandat Akta 789 untuk pendaftaran PERKESO SKSPS. "
                f"Julat pendapatan anda meletakkan anda pada {plan_label} dalam "
                f"Jadual Caruman SKSPS: RM{monthly_rm:.2f}/bulan "
                f"(RM{annual_rm:.2f}/tahun). Daftar melalui SKSPS-1 di "
                f"{portal_url}. Ini adalah caruman WAJIB — Layak memaparkannya di "
                f"sebelah skim-skim lain supaya anda boleh membuat bajet; ia TIDAK "
                f"ditumpuk ke jumlah bantuan tahunan anda."
            ),
        }
    if language == "zh":
        return {
            "summary": (
                f"{plan_label}：RM{monthly_rm:.2f}/月 → RM{annual_rm:.2f}/年，"
                f"《789 法令》下的强制缴纳 {ceiling_note}。"
            ),
            "why_qualify": (
                f"作为 {age} 岁、月收入 RM{monthly_income_rm:,.2f} 的自雇 / 零工族"
                f"报税人，您受《789 法令》关于 PERKESO SKSPS 登记的约束。您的收入"
                f"区间对应 SKSPS 缴款表中的 {plan_label}：RM{monthly_rm:.2f}/月"
                f"（RM{annual_rm:.2f}/年）。请通过 {portal_url} 的 SKSPS-1 表格登记。"
                f"这是一项强制性缴款 —— Layak 将其与其他计划一同列出，以便您预算，"
                f"它不会计入您的年度补助总额。"
            ),
        }
    return {
        "summary": (
            f"{plan_label}: RM{monthly_rm:.2f}/month → "
            f"RM{annual_rm:.2f}/year mandatory contribution under Akta 789 {ceiling_note}."
        ),
        "why_qualify": (
            f"As a self-employed / gig filer aged {age} with monthly income of "
            f"RM{monthly_income_rm:,.2f}, you fall under the Akta 789 mandate for "
            f"PERKESO SKSPS registration. Your income bracket places you on "
            f"{plan_label} of the SKSPS Jadual Caruman: RM{monthly_rm:.2f}/month "
            f"(RM{annual_rm:.2f}/year). Register via SKSPS-1 at {portal_url}. "
            "This is a MANDATORY contribution — Layak surfaces it alongside your "
            "qualifying schemes so you can budget for it; it does NOT stack into your "
            "annual relief total."
        ),
    }


def _perkeso_sksps_out_of_scope(language: SupportedLanguage, **v: Any) -> SchemeCopy:
    reasons: list[str] = v["reasons"]
    if language == "ms":
        return {
            "summary": "Tidak layak di bawah kelayakan SKSPS.",
            "why_qualify": "Di luar skop: " + "; ".join(reasons) + ".",
        }
    if language == "zh":
        return {
            "summary": "未符合 SKSPS 的资格。",
            "why_qualify": "不在受惠范围内：" + "；".join(reasons) + "。",
        }
    return {
        "summary": "Does not qualify under SKSPS eligibility.",
        "why_qualify": "Out of scope: " + "; ".join(reasons) + ".",
    }


# ---------------------------------------------------------------------------
# BUDI95 — info-only RON95 petrol subsidy card (Phase 12)
# ---------------------------------------------------------------------------


def _budi95_qualify(language: SupportedLanguage, **v: Any) -> SchemeCopy:
    age = v["age"]
    price = v["subsidised_price_rm"]
    quota = v["monthly_quota_l"]
    if language == "ms":
        return {
            "summary": (
                f"Anda layak untuk subsidi RON95 BUDI95 pada RM{price:.2f}/L, "
                f"hingga {quota} liter sebulan."
            ),
            "why_qualify": (
                f"Anda berumur {age} (≥16) — layak untuk BUDI95. Bayar petrol "
                f"RON95 pada RM{price:.2f} seliter di mana-mana stesen yang "
                f"menyertai, dengan had {quota} L sebulan per pemegang MyKad. "
                f"Klik 'Semak Baki' untuk melihat kuota tersisa di portal "
                f"rasmi (memerlukan lesen memandu Malaysia yang sah)."
            ),
        }
    if language == "zh":
        return {
            "summary": (
                f"您符合 BUDI95 RON95 补贴资格，享受每升 RM{price:.2f} 的价格，"
                f"每月最多 {quota} 升。"
            ),
            "why_qualify": (
                f"您的年龄 {age} 岁（≥16），符合 BUDI95 资格。可在任何参与的加油站"
                f"以每升 RM{price:.2f} 加 RON95 汽油，每位 MyKad 持有人每月限额"
                f" {quota} 升。点击「查询余额」前往官方门户查看剩余配额（需持有"
                f"有效的马来西亚驾照）。"
            ),
        }
    return {
        "summary": (
            f"You're eligible for the BUDI95 RON95 subsidy at RM{price:.2f}/L, "
            f"up to {quota} L per month."
        ),
        "why_qualify": (
            f"You're {age} (≥16) — eligible for BUDI95. Pay RM{price:.2f} per "
            f"litre for RON95 petrol at any participating station, capped at "
            f"{quota} L per MyKad holder per month. Click 'Check your balance' "
            f"to see your remaining quota on the official portal (requires a "
            f"valid Malaysian driving licence)."
        ),
    }


def _budi95_out_of_scope(language: SupportedLanguage, **v: Any) -> SchemeCopy:
    reasons: list[str] = v["reasons"]
    if language == "ms":
        return {
            "summary": "Belum layak untuk BUDI95.",
            "why_qualify": "Di luar skop: " + "; ".join(reasons) + ".",
        }
    if language == "zh":
        return {
            "summary": "暂不符合 BUDI95 资格。",
            "why_qualify": "不在受惠范围内：" + "；".join(reasons) + "。",
        }
    return {
        "summary": "Not yet eligible for BUDI95.",
        "why_qualify": "Out of scope: " + "; ".join(reasons) + ".",
    }


# ---------------------------------------------------------------------------
# MyKasih (SARA RM100) — info-only one-off MyKad credit (Phase 12)
# ---------------------------------------------------------------------------


def _mykasih_qualify(language: SupportedLanguage, **v: Any) -> SchemeCopy:
    age = v["age"]
    amount = v["credit_amount_rm"]
    if language == "ms":
        return {
            "summary": (
                f"RM{amount:.0f} satu kali telah dikreditkan ke MyKad anda "
                f"pada 9 Februari 2026 (SARA Untuk Semua via MyKasih)."
            ),
            "why_qualify": (
                f"Anda berumur {age} (≥18) — semua warga Malaysia dewasa "
                f"menerima RM{amount:.0f} kredit sekali ini secara automatik "
                f"ke MyKad pada 9 Feb 2026. Boleh dibelanjakan di kedai "
                f"peserta MyKasih untuk barangan keperluan asas. Tiada "
                f"permohonan diperlukan. Klik 'Semak Baki' untuk melihat "
                f"baki tersisa di portal rasmi MyKasih."
            ),
        }
    if language == "zh":
        return {
            "summary": (
                f"RM{amount:.0f} 一次性补助已于 2026 年 2 月 9 日记入您的 MyKad"
                f"（SARA Untuk Semua via MyKasih）。"
            ),
            "why_qualify": (
                f"您的年龄 {age} 岁（≥18）—— 所有成年马来西亚公民均于"
                f" 2026 年 2 月 9 日自动获得 RM{amount:.0f} 一次性 MyKad 信用。"
                f"可在 MyKasih 参与的零售店购买基本生活用品。无需申请。"
                f"请点击「查询余额」前往 MyKasih 官方门户查看剩余余额。"
            ),
        }
    return {
        "summary": (
            f"A one-off RM{amount:.0f} was credited to your MyKad on 9 Feb 2026 "
            f"(SARA Untuk Semua via MyKasih)."
        ),
        "why_qualify": (
            f"You're {age} (≥18) — every adult Malaysian received an automatic "
            f"one-off RM{amount:.0f} MyKad credit on 9 Feb 2026. Spend at any "
            f"MyKasih participating merchant for essential goods. No "
            f"application required. Click 'Check your balance' to see your "
            f"remaining balance on the official MyKasih portal."
        ),
    }


def _mykasih_out_of_scope(language: SupportedLanguage, **v: Any) -> SchemeCopy:
    reasons: list[str] = v["reasons"]
    if language == "ms":
        return {
            "summary": "Belum layak untuk MyKasih SARA RM100.",
            "why_qualify": "Di luar skop: " + "; ".join(reasons) + ".",
        }
    if language == "zh":
        return {
            "summary": "暂不符合 MyKasih SARA RM100 资格。",
            "why_qualify": "不在受惠范围内：" + "；".join(reasons) + "。",
        }
    return {
        "summary": "Not yet eligible for MyKasih SARA RM100.",
        "why_qualify": "Out of scope: " + "; ".join(reasons) + ".",
    }


# ---------------------------------------------------------------------------
# PeKa B40 — MOH/ProtectHealth health screening + cancer aid (Phase 14)
# ---------------------------------------------------------------------------


def _peka_b40_qualify(language: SupportedLanguage, **v: Any) -> SchemeCopy:
    age = v["age"]
    if language == "ms":
        return {
            "summary": (
                f"Anda berumur {age} (≥40) dan berada dalam jalur B40 — layak "
                f"untuk PeKa B40 (saringan kesihatan percuma + bantuan barah)."
            ),
            "why_qualify": (
                f"PeKa B40 menawarkan saringan kesihatan tahunan percuma, "
                f"bantuan peralatan perubatan sehingga RM20,000, insentif "
                f"rawatan barah RM1,000, dan tuntutan pengangkutan sehingga "
                f"RM500/tahun. Penerima STR berumur 40+ didaftar secara "
                f"automatik. Klik 'Semak Status' untuk pengesahan di portal "
                f"ProtectHealth."
            ),
        }
    if language == "zh":
        return {
            "summary": (
                f"您 {age} 岁（≥40）且属 B40 收入组 —— 符合 PeKa B40 资格"
                f"（免费健康检查 + 癌症补助）。"
            ),
            "why_qualify": (
                f"PeKa B40 提供每年免费健康检查、最高 RM20,000 医疗器材津贴、"
                f"RM1,000 癌症治疗奖励金，以及每年最高 RM500 交通报销。"
                f"年满 40 岁的 STR 受惠者自动登记。请点击「查询状态」前往 "
                f"ProtectHealth 官方门户确认。"
            ),
        }
    return {
        "summary": (
            f"You're {age} (≥40) and in the B40 band — eligible for PeKa B40 "
            f"(free health screening + cancer aid)."
        ),
        "why_qualify": (
            f"PeKa B40 covers a free annual health screening, medical-equipment "
            f"aid up to RM20,000, RM1,000 in cancer-treatment incentives, and "
            f"up to RM500/year transport claims. STR recipients aged 40+ are "
            f"auto-enrolled. Click 'Check status' to confirm on the "
            f"ProtectHealth portal."
        ),
    }


def _peka_b40_out_of_scope(language: SupportedLanguage, **v: Any) -> SchemeCopy:
    reasons: list[str] = v["reasons"]
    if language == "ms":
        return {
            "summary": "Belum layak untuk PeKa B40.",
            "why_qualify": "Di luar skop: " + "; ".join(reasons) + ".",
        }
    if language == "zh":
        return {
            "summary": "暂不符合 PeKa B40 资格。",
            "why_qualify": "不在受惠范围内：" + "；".join(reasons) + "。",
        }
    return {
        "summary": "Not yet eligible for PeKa B40.",
        "why_qualify": "Out of scope: " + "; ".join(reasons) + ".",
    }


# ---------------------------------------------------------------------------
# BAP — Bantuan Awal Persekolahan (RM150/child, MOE) (Phase 14)
# ---------------------------------------------------------------------------


def _bap_qualify(language: SupportedLanguage, **v: Any) -> SchemeCopy:
    child_count = v["child_count"]
    per_child_rm = v["per_child_rm"]
    annual_rm = v["annual_rm"]
    if language == "ms":
        return {
            "summary": (
                f"RM{annual_rm:,.0f}/tahun di bawah BAP — {child_count} anak × "
                f"RM{per_child_rm:.0f}, dibayar setiap Januari."
            ),
            "why_qualify": (
                f"Anda mempunyai {child_count} anak usia sekolah (6–18). Bantuan "
                f"Awal Persekolahan (BAP) 2026 membayar RM{per_child_rm:.0f} "
                f"setiap anak, sejagat tanpa had pendapatan. KPM menjelaskan "
                f"bayaran serentak setiap Januari ke akaun ibu bapa yang "
                f"berdaftar. Layak menyediakan draf borang permohonan."
            ),
        }
    if language == "zh":
        return {
            "summary": (
                f"BAP 每年 RM{annual_rm:,.0f} —— {child_count} 名孩子 × "
                f"RM{per_child_rm:.0f}，每年一月发放。"
            ),
            "why_qualify": (
                f"您有 {child_count} 名学龄孩子（6–18 岁）。2026 年开学援助金 "
                f"(BAP) 每名孩子 RM{per_child_rm:.0f}，全民派发，不设收入门槛。"
                f"教育部每年一月直接汇入家长登记账户。Layak 为您准备申请草稿。"
            ),
        }
    return {
        "summary": (
            f"RM{annual_rm:,.0f}/year under BAP — {child_count} children × "
            f"RM{per_child_rm:.0f}, paid each January."
        ),
        "why_qualify": (
            f"You have {child_count} school-age children (6–18). Bantuan Awal "
            f"Persekolahan (BAP) 2026 pays RM{per_child_rm:.0f} per child, "
            f"universally — no income cap. KPM disburses each January to the "
            f"parent's registered bank account. Layak prepares the application "
            f"draft."
        ),
    }


def _bap_out_of_scope(language: SupportedLanguage, **v: Any) -> SchemeCopy:
    reasons: list[str] = v["reasons"]
    if language == "ms":
        return {
            "summary": "Belum layak untuk BAP.",
            "why_qualify": "Di luar skop: " + "; ".join(reasons) + ".",
        }
    if language == "zh":
        return {
            "summary": "暂不符合 BAP 资格。",
            "why_qualify": "不在受惠范围内：" + "；".join(reasons) + "。",
        }
    return {
        "summary": "Not yet eligible for BAP.",
        "why_qualify": "Out of scope: " + "; ".join(reasons) + ".",
    }


# ---------------------------------------------------------------------------
# Bantuan Elektrik B40 — TNB RM40 rebate (Phase 14)
# ---------------------------------------------------------------------------


def _bantuan_elektrik_qualify(language: SupportedLanguage, **v: Any) -> SchemeCopy:
    monthly_rebate = v["monthly_rebate"]
    monthly_cost = v["monthly_cost"]
    annual_rm = v["annual_rm"]
    rebate_cap = v["rebate_cap"]
    if language == "ms":
        return {
            "summary": (
                f"Rebat RM{monthly_rebate:.0f}/bulan (RM{annual_rm:,.0f}/tahun) "
                f"pada bil TNB anda di bawah Bantuan Elektrik KIR Miskin Tegar."
            ),
            "why_qualify": (
                f"Isi rumah anda berada dalam jalur 'b40_hardcore' dan bil "
                f"elektrik bulanan ialah RM{monthly_cost:.2f}. KIR Miskin "
                f"Tegar di eKasih layak menerima rebat sehingga "
                f"RM{rebate_cap:.0f}/bulan, dikenakan secara automatik oleh "
                f"TNB. Sahkan status anda di portal Semakan Rebat PETRA."
            ),
        }
    if language == "zh":
        return {
            "summary": (
                f"TNB 电费账单每月 RM{monthly_rebate:.0f} 回扣（每年 "
                f"RM{annual_rm:,.0f}）—— eKasih 极贫家庭电费津贴。"
            ),
            "why_qualify": (
                f"您的家庭属于「赤贫」收入组，每月电费为 RM{monthly_cost:.2f}。"
                f"eKasih 登记的赤贫家庭户主可获最高 RM{rebate_cap:.0f}/月的电费"
                f"回扣，TNB 自动扣减。请前往 PETRA 的 Semakan Rebat 门户确认状态。"
            ),
        }
    return {
        "summary": (
            f"RM{monthly_rebate:.0f}/month (RM{annual_rm:,.0f}/year) electricity "
            f"rebate on your TNB bill under the KIR Miskin Tegar programme."
        ),
        "why_qualify": (
            f"Your household is in the 'b40_hardcore' band and your monthly "
            f"electricity bill is RM{monthly_cost:.2f}. eKasih-registered "
            f"Miskin Tegar heads-of-household receive up to RM{rebate_cap:.0f}/"
            f"month off the bill, applied automatically by TNB. Confirm your "
            f"status on the PETRA Semakan Rebat portal."
        ),
    }


def _bantuan_elektrik_out_of_scope(language: SupportedLanguage, **v: Any) -> SchemeCopy:
    reasons: list[str] = v["reasons"]
    if language == "ms":
        return {
            "summary": "Belum layak untuk Bantuan Elektrik TNB.",
            "why_qualify": "Di luar skop: " + "; ".join(reasons) + ".",
        }
    if language == "zh":
        return {
            "summary": "暂不符合 TNB 电费津贴资格。",
            "why_qualify": "不在受惠范围内：" + "；".join(reasons) + "。",
        }
    return {
        "summary": "Not yet eligible for TNB Bantuan Elektrik.",
        "why_qualify": "Out of scope: " + "; ".join(reasons) + ".",
    }


# ---------------------------------------------------------------------------
# KWSP i-Suri — government top-up for housewives (Phase 14)
# ---------------------------------------------------------------------------


def _i_suri_qualify(language: SupportedLanguage, **v: Any) -> SchemeCopy:
    spouse_age = v["spouse_age"]
    annual = v["annual_incentive_rm"]
    lifetime = v["lifetime_cap_rm"]
    max_age = v["max_age"]
    if language == "ms":
        return {
            "summary": (
                f"Pasangan anda (umur {spouse_age}) layak untuk i-Suri — "
                f"insentif kerajaan sehingga RM{annual:.0f}/tahun ke akaun EPF "
                f"beliau."
            ),
            "why_qualify": (
                f"Pasangan anda berumur {spouse_age} (≤{max_age}) tanpa "
                f"pendapatan dilaporkan. Jika beliau berdaftar di eKasih dan "
                f"menyumbang ≥RM600/tahun secara sukarela kepada i-Suri, "
                f"kerajaan akan memadankan RM{annual:.0f}/tahun (had seumur "
                f"hidup RM{lifetime:,.0f}). Daftar di portal KWSP."
            ),
        }
    if language == "zh":
        return {
            "summary": (
                f"您的配偶（{spouse_age} 岁）符合 i-Suri 资格 —— 政府每年最多"
                f" RM{annual:.0f} 注入其公积金账户。"
            ),
            "why_qualify": (
                f"您的配偶 {spouse_age} 岁（≤{max_age}）且无申报收入。若在 eKasih "
                f"登记并每年自愿缴纳至少 RM600 至 i-Suri，政府将匹配"
                f" RM{annual:.0f}/年（终身上限 RM{lifetime:,.0f}）。请前往 "
                f"KWSP 官方门户注册。"
            ),
        }
    return {
        "summary": (
            f"Your spouse (age {spouse_age}) is eligible for i-Suri — government "
            f"incentive up to RM{annual:.0f}/year into their EPF account."
        ),
        "why_qualify": (
            f"Your spouse is {spouse_age} (≤{max_age}) with no reported income. "
            f"Once registered in eKasih and contributing ≥RM600/year voluntarily "
            f"to i-Suri, the government matches RM{annual:.0f}/year (lifetime "
            f"cap RM{lifetime:,.0f}). Register on the KWSP portal."
        ),
    }


def _i_suri_out_of_scope(language: SupportedLanguage, **v: Any) -> SchemeCopy:
    reasons: list[str] = v["reasons"]
    if language == "ms":
        return {
            "summary": "Belum layak untuk KWSP i-Suri.",
            "why_qualify": "Di luar skop: " + "; ".join(reasons) + ".",
        }
    if language == "zh":
        return {
            "summary": "暂不符合 KWSP i-Suri 资格。",
            "why_qualify": "不在受惠范围内：" + "；".join(reasons) + "。",
        }
    return {
        "summary": "Not yet eligible for KWSP i-Suri.",
        "why_qualify": "Out of scope: " + "; ".join(reasons) + ".",
    }


# ---------------------------------------------------------------------------
# MySalam — free critical-illness cover for B40 (Phase 14)
# ---------------------------------------------------------------------------


def _mysalam_qualify(language: SupportedLanguage, **v: Any) -> SchemeCopy:
    age = v["age"]
    lump_sum = v["lump_sum_rm"]
    daily = v["hospital_daily_rm"]
    max_days = v["hospital_max_days"]
    if language == "ms":
        return {
            "summary": (
                f"Perlindungan kritikal RM{lump_sum:,.0f} sekali bayar + "
                f"RM{daily:.0f}/hari (sehingga {max_days} hari) di bawah "
                f"MySalam."
            ),
            "why_qualify": (
                f"Anda berumur {age} (18–65) dan berada dalam jalur pendapatan "
                f"B40. MySalam memberi perlindungan kritikal percuma — "
                f"RM{lump_sum:,.0f} sekali bayar pada diagnosis 45 penyakit "
                f"kritikal yang disenaraikan, serta RM{daily:.0f}/hari "
                f"penggantian pendapatan untuk kemasukan hospital kerajaan "
                f"sehingga {max_days} hari/tahun. Dibiayai sepenuhnya oleh "
                f"kerajaan — tiada premium dibayar."
            ),
        }
    if language == "zh":
        return {
            "summary": (
                f"MySalam 重大疾病保障：一次性 RM{lump_sum:,.0f} + "
                f"住院日津贴 RM{daily:.0f}（最多 {max_days} 天）。"
            ),
            "why_qualify": (
                f"您 {age} 岁（18–65）且属 B40 收入组。MySalam 提供免费重大疾病"
                f"保障 —— 确诊 45 种列明重病可获一次性 RM{lump_sum:,.0f} 现金，"
                f"政府医院住院期间另发 RM{daily:.0f}/天收入替补津贴，每年最多"
                f" {max_days} 天。完全由政府承担，无需缴纳保费。"
            ),
        }
    return {
        "summary": (
            f"MySalam critical-illness cover — RM{lump_sum:,.0f} lump sum + "
            f"RM{daily:.0f}/day hospital income (up to {max_days} days)."
        ),
        "why_qualify": (
            f"You're {age} (18–65) and in the B40 income band. MySalam offers "
            f"free critical-illness protection — a one-off RM{lump_sum:,.0f} "
            f"on diagnosis of any of 45 listed critical illnesses, plus "
            f"RM{daily:.0f}/day income replacement for stays at government "
            f"hospitals (up to {max_days} days/year). Fully government-funded "
            f"— no premium payable."
        ),
    }


def _mysalam_out_of_scope(language: SupportedLanguage, **v: Any) -> SchemeCopy:
    reasons: list[str] = v["reasons"]
    if language == "ms":
        return {
            "summary": "Belum layak untuk MySalam.",
            "why_qualify": "Di luar skop: " + "; ".join(reasons) + ".",
        }
    if language == "zh":
        return {
            "summary": "暂不符合 MySalam 资格。",
            "why_qualify": "不在受惠范围内：" + "；".join(reasons) + "。",
        }
    return {
        "summary": "Not yet eligible for MySalam.",
        "why_qualify": "Out of scope: " + "; ".join(reasons) + ".",
    }


# ---------------------------------------------------------------------------
# SARA — Sumbangan Asas Rahmah (MyKad monthly credit) (Phase 14)
# ---------------------------------------------------------------------------


def _sara_qualify(language: SupportedLanguage, **v: Any) -> SchemeCopy:
    monthly_rm = v["monthly_rm"]
    annual_rm = v["annual_rm"]
    enhanced = bool(v["enhanced"])
    if language == "ms":
        tier_note = (
            "kadar dipertingkat untuk isi rumah eKasih Miskin Tegar"
            if enhanced
            else "kadar standard untuk penerima STR"
        )
        return {
            "summary": (
                f"RM{monthly_rm:.0f}/bulan kredit MyKad SARA — "
                f"RM{annual_rm:,.0f}/tahun ({tier_note})."
            ),
            "why_qualify": (
                f"Anda berada dalam jalur B40 dan layak STR. SARA mengkredit "
                f"RM{monthly_rm:.0f}/bulan ke MyKad anda, dibelanjakan di kedai "
                f"peserta MyKasih untuk barangan keperluan asas. Tiada "
                f"permohonan diperlukan — kerajaan akan mengaktifkan kredit "
                f"setelah pengesahan STR di portal rasmi SARA."
            ),
        }
    if language == "zh":
        tier_note = (
            "eKasih 极贫家庭增强额"
            if enhanced
            else "STR 受惠者标准额"
        )
        return {
            "summary": (
                f"SARA 每月 RM{monthly_rm:.0f} MyKad 信用 —— 每年 "
                f"RM{annual_rm:,.0f}（{tier_note}）。"
            ),
            "why_qualify": (
                f"您属 B40 收入组且符合 STR。SARA 每月把 RM{monthly_rm:.0f} "
                f"记入您的 MyKad，可在参与的 MyKasih 商店购买基本生活用品。"
                f"无需申请 —— 政府将在 SARA 官方门户确认 STR 状态后自动激活。"
            ),
        }
    tier_note = (
        "enhanced rate for eKasih hardcore-poor households"
        if enhanced
        else "standard STR-recipient rate"
    )
    return {
        "summary": (
            f"RM{monthly_rm:.0f}/month SARA MyKad credit — RM{annual_rm:,.0f}/"
            f"year ({tier_note})."
        ),
        "why_qualify": (
            f"You're in the B40 band and STR-eligible. SARA credits "
            f"RM{monthly_rm:.0f}/month to your MyKad, spendable at "
            f"MyKasih-participating retailers for essentials. No application "
            f"required — the government activates the credit after STR "
            f"confirmation on the official SARA portal."
        ),
    }


def _sara_out_of_scope(language: SupportedLanguage, **v: Any) -> SchemeCopy:
    reasons: list[str] = v["reasons"]
    if language == "ms":
        return {
            "summary": "Belum layak untuk SARA.",
            "why_qualify": "Di luar skop: " + "; ".join(reasons) + ".",
        }
    if language == "zh":
        return {
            "summary": "暂不符合 SARA 资格。",
            "why_qualify": "不在受惠范围内：" + "；".join(reasons) + "。",
        }
    return {
        "summary": "Not yet eligible for SARA.",
        "why_qualify": "Out of scope: " + "; ".join(reasons) + ".",
    }


# ---------------------------------------------------------------------------
# RMT — Rancangan Makanan Tambahan (free school meals) (Phase 14)
# ---------------------------------------------------------------------------


def _rmt_qualify(language: SupportedLanguage, **v: Any) -> SchemeCopy:
    child_count = v["child_count"]
    if language == "ms":
        return {
            "summary": (
                f"{child_count} anak rendah anda layak untuk sarapan sekolah "
                f"percuma di bawah RMT."
            ),
            "why_qualify": (
                f"Anda mempunyai {child_count} anak berumur 6–12 dalam isi "
                f"rumah B40. Rancangan Makanan Tambahan (RMT) menyediakan "
                f"sarapan sekolah harian percuma kepada murid sekolah rendah "
                f"dari isi rumah B40, dikenal pasti oleh jawatankuasa RMT "
                f"sekolah. Tiada permohonan pusat — berbincanglah dengan guru "
                f"besar selepas mengisytiharkan pendapatan."
            ),
        }
    if language == "zh":
        return {
            "summary": (
                f"您的 {child_count} 名小学子女可获 RMT 学校免费早餐资格。"
            ),
            "why_qualify": (
                f"您有 {child_count} 名 6–12 岁的子女属 B40 家庭。学校膳食"
                f"补助计划 (RMT) 为 B40 家庭的小学生提供每日免费早餐，由学校的"
                f" RMT 委员会鉴定受惠学生。无需中央申请 —— 向校长申报家庭"
                f"收入后即可启动。"
            ),
        }
    return {
        "summary": (
            f"Your {child_count} primary-school children qualify for free "
            f"school breakfast under RMT."
        ),
        "why_qualify": (
            f"You have {child_count} children aged 6–12 in a B40 household. "
            f"Rancangan Makanan Tambahan (RMT) provides daily free school "
            f"breakfast to primary-school pupils from B40 households, "
            f"identified by the school's RMT committee. No central application "
            f"— speak with the head teacher after declaring household income."
        ),
    }


def _rmt_out_of_scope(language: SupportedLanguage, **v: Any) -> SchemeCopy:
    reasons: list[str] = v["reasons"]
    if language == "ms":
        return {
            "summary": "Belum layak untuk RMT.",
            "why_qualify": "Di luar skop: " + "; ".join(reasons) + ".",
        }
    if language == "zh":
        return {
            "summary": "暂不符合 RMT 资格。",
            "why_qualify": "不在受惠范围内：" + "；".join(reasons) + "。",
        }
    return {
        "summary": "Not yet eligible for RMT.",
        "why_qualify": "Out of scope: " + "; ".join(reasons) + ".",
    }


# ---------------------------------------------------------------------------
# SPBT — Skim Pinjaman Buku Teks (universal textbook loan) (Phase 15)
# ---------------------------------------------------------------------------


def _spbt_qualify(language: SupportedLanguage, **v: Any) -> SchemeCopy:
    child_count = v["child_count"]
    per_child = v["per_child_value_rm"]
    annual_value = v["annual_value_rm"]
    if language == "ms":
        return {
            "summary": (
                f"{child_count} anak anda layak untuk pinjaman buku teks SPBT "
                f"percuma — nilai anggaran RM{annual_value:,.0f}/tahun."
            ),
            "why_qualify": (
                f"Anda mempunyai {child_count} anak usia sekolah. SPBT "
                f"diperluaskan kepada semua pelajar warganegara Malaysia di "
                f"sekolah Kerajaan dan Bantuan Kerajaan sejak 2008, dan "
                f"sekolah meminjamkan set buku teks setiap tahun. Nilai "
                f"setara dianggar RM{per_child:.0f}/anak/tahun. Tiada "
                f"permohonan diperlukan — hubungi guru kelas atau guru "
                f"penyelaras SPBT sekolah."
            ),
        }
    if language == "zh":
        return {
            "summary": (
                f"您的 {child_count} 名孩子可获 SPBT 免费课本借用 —— 估值"
                f"每年 RM{annual_value:,.0f}。"
            ),
            "why_qualify": (
                f"您有 {child_count} 名学龄孩子。课本借用计划 (SPBT) 自 2008 年起"
                f"扩大至所有政府及政府资助学校的马来西亚籍学生，学校每年免费借出"
                f"完整课本套。每名孩子年估值 RM{per_child:.0f}。无需申请 —— "
                f"请向班主任或学校 SPBT 协调老师领取。"
            ),
        }
    return {
        "summary": (
            f"Your {child_count} children qualify for the SPBT free textbook "
            f"loan — estimated value RM{annual_value:,.0f}/year."
        ),
        "why_qualify": (
            f"You have {child_count} school-age children. SPBT was "
            f"universalised in 2008 — every Malaysian citizen in a government "
            f"or government-aided school receives the annual textbook set on "
            f"loan, free of charge. Estimated value RM{per_child:.0f}/child/"
            f"year. No application required — collect from the form teacher "
            f"or the school's SPBT coordinator."
        ),
    }


def _spbt_out_of_scope(language: SupportedLanguage, **v: Any) -> SchemeCopy:
    reasons: list[str] = v["reasons"]
    if language == "ms":
        return {
            "summary": "Belum layak untuk SPBT.",
            "why_qualify": "Di luar skop: " + "; ".join(reasons) + ".",
        }
    if language == "zh":
        return {
            "summary": "暂不符合 SPBT 资格。",
            "why_qualify": "不在受惠范围内：" + "；".join(reasons) + "。",
        }
    return {
        "summary": "Not yet eligible for SPBT.",
        "why_qualify": "Out of scope: " + "; ".join(reasons) + ".",
    }


# ---------------------------------------------------------------------------
# KWAPM — Kumpulan Wang Amanah Pelajar Miskin (Phase 15)
# ---------------------------------------------------------------------------


def _kwapm_qualify(language: SupportedLanguage, **v: Any) -> SchemeCopy:
    child_count = v["child_count"]
    per_child = v["per_child_rm"]
    annual_rm = v["annual_rm"]
    if language == "ms":
        return {
            "summary": (
                f"RM{annual_rm:,.0f}/tahun di bawah KWAPM — {child_count} anak × "
                f"RM{per_child:.0f}."
            ),
            "why_qualify": (
                f"Anda mempunyai {child_count} anak sekolah rendah dalam jalur "
                f"pendapatan paling rendah (b40_hardcore). KWAPM membayar "
                f"RM{per_child:.0f}/anak/tahun ke akaun ibu bapa melalui "
                f"jawatankuasa sekolah. Jawatankuasa juga menyediakan bantuan "
                f"kecemasan RM300/insiden bagi keluarga yang menghadapi krisis."
            ),
        }
    if language == "zh":
        return {
            "summary": (
                f"KWAPM 每年 RM{annual_rm:,.0f} —— {child_count} 名孩子 × "
                f"RM{per_child:.0f}。"
            ),
            "why_qualify": (
                f"您有 {child_count} 名小学子女且属最低收入组（b40_hardcore）。"
                f"KWAPM 每名孩子每年 RM{per_child:.0f} 由学校委员会汇入家长账户。"
                f"委员会也提供每宗 RM300 的紧急援助以协助突发危机。"
            ),
        }
    return {
        "summary": (
            f"RM{annual_rm:,.0f}/year under KWAPM — {child_count} children × "
            f"RM{per_child:.0f}."
        ),
        "why_qualify": (
            f"You have {child_count} primary-school children in the lowest "
            f"income band (b40_hardcore). KWAPM pays RM{per_child:.0f}/child/"
            f"year via the school KWAPM committee into the parent's bank "
            f"account. The committee also runs an emergency-aid track of "
            f"RM300/incident for families facing crisis events."
        ),
    }


def _kwapm_out_of_scope(language: SupportedLanguage, **v: Any) -> SchemeCopy:
    reasons: list[str] = v["reasons"]
    if language == "ms":
        return {
            "summary": "Belum layak untuk KWAPM.",
            "why_qualify": "Di luar skop: " + "; ".join(reasons) + ".",
        }
    if language == "zh":
        return {
            "summary": "暂不符合 KWAPM 资格。",
            "why_qualify": "不在受惠范围内：" + "；".join(reasons) + "。",
        }
    return {
        "summary": "Not yet eligible for KWAPM.",
        "why_qualify": "Out of scope: " + "; ".join(reasons) + ".",
    }


# ---------------------------------------------------------------------------
# PERKESO SIP — Employment Insurance System (Akta 800) (Phase 16)
# ---------------------------------------------------------------------------


def _perkeso_sip_qualify(language: SupportedLanguage, **v: Any) -> SchemeCopy:
    age = v["age"]
    first_pct = v["first_month_pct"]
    max_monthly = v["max_monthly_rm"]
    ceiling = v["wage_ceiling_rm"]
    if language == "ms":
        return {
            "summary": (
                f"Anda berumur {age} dan bergaji — telah dilindungi oleh "
                f"PERKESO SIP terhadap kehilangan pekerjaan tanpa rela."
            ),
            "why_qualify": (
                f"Sebagai pemfail Form BE berumur {age} (18–60), majikan anda "
                f"sepatutnya menyumbang kepada Sistem Insurans Pekerjaan (SIP) "
                f"di bawah Akta 800. Jika anda hilang pekerjaan secara tidak "
                f"sukarela, anda boleh menuntut Elaun Mencari Pekerjaan "
                f"sehingga {first_pct}% dari gaji bulanan anggaran pada bulan "
                f"pertama (had RM{max_monthly:,.0f}/bulan berdasarkan siling "
                f"upah RM{ceiling:,.0f}), tapering kepada 50%/40%/30% untuk "
                f"6 bulan secara keseluruhan."
            ),
        }
    if language == "zh":
        return {
            "summary": (
                f"您 {age} 岁且为受薪员工 —— 已由 PERKESO 就业保险（SIP）覆盖"
                f"非自愿失业风险。"
            ),
            "why_qualify": (
                f"作为 {age} 岁（18–60）的 Form BE 报税人，您的雇主依据 800 号"
                f"法令向 SIP 缴费。若非自愿失业，您可申请寻职津贴，第 1 个月"
                f"最高 {first_pct}% 推定月薪（按 RM{ceiling:,.0f} 上限计算最高"
                f" RM{max_monthly:,.0f}/月），其后逐月降至 50%/40%/30%，"
                f"总共最长 6 个月。"
            ),
        }
    return {
        "summary": (
            f"You're {age} and salaried — already covered by PERKESO SIP "
            f"against involuntary job loss."
        ),
        "why_qualify": (
            f"As a Form BE filer aged {age} (18–60), your employer should be "
            f"contributing to the Employment Insurance System (SIP, Akta 800). "
            f"On involuntary job loss you can claim the Job Search Allowance "
            f"at up to {first_pct}% of assumed monthly wage in month 1 (capped "
            f"at RM{max_monthly:,.0f}/month against the RM{ceiling:,.0f} "
            f"insured-wage ceiling), tapering to 50%/40%/30% across up to 6 "
            f"months."
        ),
    }


def _perkeso_sip_out_of_scope(language: SupportedLanguage, **v: Any) -> SchemeCopy:
    reasons: list[str] = v["reasons"]
    if language == "ms":
        return {
            "summary": "Belum layak untuk PERKESO SIP.",
            "why_qualify": "Di luar skop: " + "; ".join(reasons) + ".",
        }
    if language == "zh":
        return {
            "summary": "暂不符合 PERKESO 就业保险（SIP）资格。",
            "why_qualify": "不在受惠范围内：" + "；".join(reasons) + "。",
        }
    return {
        "summary": "Not yet eligible for PERKESO SIP.",
        "why_qualify": "Out of scope: " + "; ".join(reasons) + ".",
    }


# ---------------------------------------------------------------------------
# TASKA Permata — KPWKM preschool fee subsidy (Phase 15)
# ---------------------------------------------------------------------------


def _taska_permata_qualify(language: SupportedLanguage, **v: Any) -> SchemeCopy:
    child_count = v["child_count"]
    monthly_subsidy = v["monthly_subsidy_rm"]
    annual_rm = v["annual_rm"]
    if language == "ms":
        return {
            "summary": (
                f"RM{annual_rm:,.0f}/tahun subsidi yuran TASKA / TADIKA Permata"
                f" — RM{monthly_subsidy:.0f}/bulan × {child_count} kanak-kanak."
            ),
            "why_qualify": (
                f"Anda mempunyai {child_count} kanak-kanak berumur 0–6 dan "
                f"pendapatan isi rumah ≤RM5,000. Jabatan Permata di bawah "
                f"KPWKM menyubsidi sehingga RM{monthly_subsidy:.0f}/bulan/"
                f"kanak-kanak di pusat TASKA / TADIKA Permata yang berdaftar. "
                f"Subsidi dikenakan terus di pusat — semak direktori Permata "
                f"untuk pusat berhampiran."
            ),
        }
    if language == "zh":
        return {
            "summary": (
                f"TASKA / TADIKA Permata 学费津贴每年 RM{annual_rm:,.0f} —— "
                f"RM{monthly_subsidy:.0f}/月 × {child_count} 名幼儿。"
            ),
            "why_qualify": (
                f"您有 {child_count} 名 0–6 岁的幼儿且家庭月收入 ≤RM5,000。"
                f"KPWKM 旗下的 Jabatan Permata 在注册的 TASKA / TADIKA Permata 中心"
                f"为每名幼儿每月津贴最高 RM{monthly_subsidy:.0f}。津贴直接在中心"
                f"申请 —— 请参阅 Permata 目录查找附近的中心。"
            ),
        }
    return {
        "summary": (
            f"RM{annual_rm:,.0f}/year TASKA / TADIKA Permata fee subsidy — "
            f"RM{monthly_subsidy:.0f}/month × {child_count} young children."
        ),
        "why_qualify": (
            f"You have {child_count} children aged 0–6 and household income "
            f"≤RM5,000. Jabatan Permata (under KPWKM) subsidises up to "
            f"RM{monthly_subsidy:.0f}/month per child at registered TASKA / "
            f"TADIKA Permata centres. The subsidy is applied at the centre — "
            f"check the Permata directory for participating centres near you."
        ),
    }


def _taska_permata_out_of_scope(language: SupportedLanguage, **v: Any) -> SchemeCopy:
    reasons: list[str] = v["reasons"]
    if language == "ms":
        return {
            "summary": "Belum layak untuk subsidi TASKA / TADIKA Permata.",
            "why_qualify": "Di luar skop: " + "; ".join(reasons) + ".",
        }
    if language == "zh":
        return {
            "summary": "暂不符合 TASKA / TADIKA Permata 津贴资格。",
            "why_qualify": "不在受惠范围内：" + "；".join(reasons) + "。",
        }
    return {
        "summary": "Not yet eligible for TASKA / TADIKA Permata subsidy.",
        "why_qualify": "Out of scope: " + "; ".join(reasons) + ".",
    }


# ---------------------------------------------------------------------------
# Reason fragments — rule modules pass localised reason strings into the
# `out_of_scope` callables above. Keeping reason strings here (rather than
# re-translating the full "Out of scope: X; Y." sentence inside every rule)
# lets rule modules stay focused on the numeric thresholds.
# ---------------------------------------------------------------------------


def out_of_scope_reason(
    key: str,
    language: SupportedLanguage,
    **v: Any,
) -> str:
    """Return a localised reason fragment used inside `out_of_scope` copy.

    `key` is the rule-specific failure mode (e.g. "no_child_under_18",
    "income_above_ceiling"). Keeps per-rule reasons deterministic — the rule
    module passes numeric values in `vars` and picks the key for each
    failing guard.
    """
    fragment = _REASON_FRAGMENTS[key][language]
    return fragment.format(**v)


_REASON_FRAGMENTS: dict[str, dict[SupportedLanguage, str]] = {
    # ---- STR 2026 ----
    "str_no_child_under_18": {
        "en": "no child under 18 in household",
        "ms": "tiada anak berumur di bawah 18 dalam isi rumah",
        "zh": "家庭中没有未满 18 岁的孩子",
    },
    "str_income_above_ceiling": {
        "en": "income RM{income:,.0f} exceeds RM5,000 ceiling",
        "ms": "pendapatan RM{income:,.0f} melebihi siling RM5,000",
        "zh": "月收入 RM{income:,.0f} 超过 RM5,000 上限",
    },
    # ---- JKM Warga Emas ----
    "jkm_warga_emas_no_elderly_parent": {
        "en": "no parent dependant aged ≥{threshold} in household",
        "ms": "tiada tanggungan ibu bapa berumur ≥{threshold} dalam isi rumah",
        "zh": "家庭中没有 {threshold} 岁及以上的年长父母作为受扶养人",
    },
    "jkm_warga_emas_income_above_pli": {
        "en": "per-capita income RM{per_capita:,.0f} exceeds food-PLI RM{food_pli:,.0f}",
        "ms": "pendapatan per kapita RM{per_capita:,.0f} melebihi PLI makanan RM{food_pli:,.0f}",
        "zh": "人均月收入 RM{per_capita:,.0f} 超过食物贫困线 RM{food_pli:,.0f}",
    },
    # ---- JKM BKK ----
    "jkm_bkk_no_child": {
        "en": "no child dependant aged <{threshold} in household",
        "ms": "tiada tanggungan anak berumur <{threshold} dalam isi rumah",
        "zh": "家庭中没有年龄未满 {threshold} 岁的受扶养子女",
    },
    "jkm_bkk_income_above_threshold": {
        "en": "per-capita income RM{per_capita:,.0f} exceeds BKK threshold RM{threshold:,.0f}",
        "ms": "pendapatan per kapita RM{per_capita:,.0f} melebihi ambang BKK RM{threshold:,.0f}",
        "zh": "人均月收入 RM{per_capita:,.0f} 超过 BKK 门槛 RM{threshold:,.0f}",
    },
    # ---- i-Saraan ----
    "i_saraan_not_self_employed": {
        "en": "filer is not self-employed (Form B); i-Saraan targets gig / business filers without employer EPF",
        "ms": "pemfail bukan pekerja sendiri (Form B); i-Saraan menyasarkan pemfail gig / perniagaan tanpa EPF majikan",
        "zh": "您并非自雇报税人 (Form B)；i-Saraan 面向没有雇主 EPF 供款的零工 / 自营业者",
    },
    "i_saraan_age_outside_window": {
        "en": "age {age} outside the i-Saraan window ({min_age}-{max_age})",
        "ms": "umur {age} di luar tetingkap i-Saraan ({min_age}-{max_age})",
        "zh": "年龄 {age} 岁超出 i-Saraan 的 {min_age}-{max_age} 岁区间",
    },
    # ---- BUDI95 ----
    "budi95_age_below_min": {
        "en": "age {age} below the BUDI95 minimum of {min_age}",
        "ms": "umur {age} di bawah minimum BUDI95 iaitu {min_age}",
        "zh": "年龄 {age} 岁低于 BUDI95 的最低 {min_age} 岁",
    },
    # ---- MyKasih (SARA RM100) ----
    "mykasih_age_below_min": {
        "en": "age {age} below the MyKasih SARA minimum of {min_age}",
        "ms": "umur {age} di bawah minimum MyKasih SARA iaitu {min_age}",
        "zh": "年龄 {age} 岁低于 MyKasih SARA 的最低 {min_age} 岁",
    },
    # ---- PeKa B40 ----
    "peka_b40_age_below_min": {
        "en": "age {age} below the PeKa B40 minimum of {min_age}",
        "ms": "umur {age} di bawah minimum PeKa B40 iaitu {min_age}",
        "zh": "年龄 {age} 岁低于 PeKa B40 最低 {min_age} 岁的门槛",
    },
    "peka_b40_band_above_b40": {
        "en": "household income band '{band}' is above the B40 ceiling",
        "ms": "jalur pendapatan isi rumah '{band}' melebihi siling B40",
        "zh": "家庭收入分组「{band}」超出 B40 上限",
    },
    # ---- BAP ----
    "bap_no_school_age_child": {
        "en": "no child dependant aged {min_age}–{max_age} in household",
        "ms": "tiada tanggungan anak berumur {min_age}–{max_age} dalam isi rumah",
        "zh": "家庭中没有 {min_age}–{max_age} 岁的受扶养子女",
    },
    # ---- Bantuan Elektrik ----
    "bantuan_elektrik_band_above_hardcore": {
        "en": "household income band '{band}' is above eKasih Miskin Tegar",
        "ms": "jalur pendapatan isi rumah '{band}' melebihi Miskin Tegar eKasih",
        "zh": "家庭收入分组「{band}」超出 eKasih 极贫范围",
    },
    "bantuan_elektrik_no_bill": {
        "en": "no domestic TNB electricity bill on file",
        "ms": "tiada bil elektrik TNB domestik dalam rekod",
        "zh": "档案中没有 TNB 家庭电费账单",
    },
    # ---- i-Suri ----
    "i_suri_no_zero_income_spouse": {
        "en": "no spouse aged {min_age}–{max_age} with zero declared income",
        "ms": "tiada pasangan berumur {min_age}–{max_age} dengan sifar pendapatan diisytiharkan",
        "zh": "家庭中没有 {min_age}–{max_age} 岁、无申报收入的配偶",
    },
    # ---- MySalam ----
    "mysalam_age_outside_window": {
        "en": "age {age} outside the MySalam window ({min_age}–{max_age})",
        "ms": "umur {age} di luar tetingkap MySalam ({min_age}–{max_age})",
        "zh": "年龄 {age} 岁超出 MySalam 的 {min_age}–{max_age} 岁范围",
    },
    "mysalam_band_above_threshold": {
        "en": "household income band '{band}' above MySalam B40-low cap",
        "ms": "jalur pendapatan isi rumah '{band}' melebihi siling B40-rendah MySalam",
        "zh": "家庭收入分组「{band}」超出 MySalam B40-低收入门槛",
    },
    # ---- SARA ----
    "sara_band_above_b40": {
        "en": "household income band '{band}' is above the B40 ceiling",
        "ms": "jalur pendapatan isi rumah '{band}' melebihi siling B40",
        "zh": "家庭收入分组「{band}」超出 B40 上限",
    },
    # ---- RMT ----
    "rmt_band_above_b40": {
        "en": "household income band '{band}' is above the B40 ceiling",
        "ms": "jalur pendapatan isi rumah '{band}' melebihi siling B40",
        "zh": "家庭收入分组「{band}」超出 B40 上限",
    },
    "rmt_no_primary_child": {
        "en": "no primary-school-age child ({min_age}–{max_age}) in household",
        "ms": "tiada anak usia sekolah rendah ({min_age}–{max_age}) dalam isi rumah",
        "zh": "家庭中没有 {min_age}–{max_age} 岁的小学龄孩子",
    },
    # ---- SPBT ----
    "spbt_no_school_age_child": {
        "en": "no school-age child ({min_age}–{max_age}) in household",
        "ms": "tiada anak usia sekolah ({min_age}–{max_age}) dalam isi rumah",
        "zh": "家庭中没有 {min_age}–{max_age} 岁的学龄孩子",
    },
    # ---- KWAPM ----
    "kwapm_band_above_hardcore": {
        "en": "household income band '{band}' above b40_hardcore — KWAPM is needs-tested",
        "ms": "jalur pendapatan isi rumah '{band}' melebihi b40_hardcore — KWAPM diuji-keperluan",
        "zh": "家庭收入分组「{band}」超出 b40_hardcore —— KWAPM 为需求型援助",
    },
    "kwapm_no_primary_child": {
        "en": "no primary-school child ({min_age}–{max_age}) in household",
        "ms": "tiada anak sekolah rendah ({min_age}–{max_age}) dalam isi rumah",
        "zh": "家庭中没有 {min_age}–{max_age} 岁的小学子女",
    },
    # ---- PERKESO SIP ----
    "perkeso_sip_not_salaried": {
        "en": "SIP coverage only applies to salaried (Form BE) filers with employer EIS contributions",
        "ms": "Perlindungan SIP hanya terpakai kepada pemfail bergaji (Form BE) dengan caruman SIP majikan",
        "zh": "SIP 仅覆盖雇主缴纳 EIS 的受薪报税人（Form BE）",
    },
    "perkeso_sip_age_outside_window": {
        "en": "age {age} outside the SIP window ({min_age}–{max_age})",
        "ms": "umur {age} di luar tetingkap SIP ({min_age}–{max_age})",
        "zh": "年龄 {age} 岁超出 SIP 的 {min_age}–{max_age} 岁范围",
    },
    # ---- TASKA Permata ----
    "taska_permata_income_above_cap": {
        "en": "household income RM{household_income:,.0f} exceeds Permata cap RM{cap:,.0f}",
        "ms": "pendapatan isi rumah RM{household_income:,.0f} melebihi siling Permata RM{cap:,.0f}",
        "zh": "家庭月收入 RM{household_income:,.0f} 超出 Permata 上限 RM{cap:,.0f}",
    },
    "taska_permata_no_preschool_child": {
        "en": "no preschool-age child ({min_age}–{max_age}) in household",
        "ms": "tiada kanak-kanak prasekolah ({min_age}–{max_age}) dalam isi rumah",
        "zh": "家庭中没有 {min_age}–{max_age} 岁的学前儿童",
    },
    # ---- PERKESO SKSPS ----
    "perkeso_sksps_not_gig": {
        "en": "SKSPS only applies to self-employed / gig filers (Form B)",
        "ms": "SKSPS hanya terpakai kepada pemfail pekerja sendiri / gig (Form B)",
        "zh": "SKSPS 仅适用于自雇 / 零工报税人 (Form B)",
    },
    "perkeso_sksps_age_outside_window": {
        "en": "applicant age {age} is outside the Akta 789 window ({min_age}–{max_age})",
        "ms": "umur pemohon {age} di luar tetingkap Akta 789 ({min_age}–{max_age})",
        "zh": "申请人年龄 {age} 岁超出《789 法令》的 {min_age}–{max_age} 岁范围",
    },
}


# Localised glue strings that each rule optionally stitches into its
# free-text copy (e.g. BKK's "(capped at ...)" note or SKSPS's ceiling note).


def bkk_cap_note(monthly_cap_rm: float, language: SupportedLanguage) -> str:
    """BKK household-max cap note; empty string if uncapped (the caller decides)."""
    if language == "ms":
        return f" (dihadkan pada RM{monthly_cap_rm:,.0f}/bulan maksimum isi rumah)"
    if language == "zh":
        return f"（家庭最高补助限额为 RM{monthly_cap_rm:,.0f}/月）"
    return f" (capped at RM{monthly_cap_rm:,.0f}/month household maximum)"


def bkk_breakdown(
    younger_count: int,
    younger_rate: float,
    younger_age_max: int,
    older_count: int,
    older_rate: float,
    language: SupportedLanguage,
) -> str:
    """Per-child-rate breakdown line (already pluralised & localised)."""
    parts: list[str] = []
    if younger_count:
        if language == "ms":
            parts.append(f"{younger_count} × RM{younger_rate:,.0f} (umur ≤{younger_age_max})")
        elif language == "zh":
            parts.append(f"{younger_count} × RM{younger_rate:,.0f}（{younger_age_max} 岁及以下）")
        else:
            parts.append(f"{younger_count} × RM{younger_rate:,.0f} (age ≤{younger_age_max})")
    if older_count:
        band_from = younger_age_max + 1
        if language == "ms":
            parts.append(f"{older_count} × RM{older_rate:,.0f} (umur {band_from}–17)")
        elif language == "zh":
            parts.append(f"{older_count} × RM{older_rate:,.0f}（{band_from}–17 岁）")
        else:
            parts.append(f"{older_count} × RM{older_rate:,.0f} (age {band_from}–17)")
    return " + ".join(parts)


def sksps_ceiling_note(
    *,
    income_ceiling_rm: float | None,
    highest_finite_ceiling_rm: float,
    language: SupportedLanguage,
) -> str:
    if income_ceiling_rm is None:
        if language == "ms":
            return f"(pendapatan > RM{highest_finite_ceiling_rm:,.0f})"
        if language == "zh":
            return f"（月收入 > RM{highest_finite_ceiling_rm:,.0f}）"
        return f"(income > RM{highest_finite_ceiling_rm:,.0f})"
    if language == "ms":
        return f"(pendapatan ≤ RM{income_ceiling_rm:,.0f})"
    if language == "zh":
        return f"（月收入 ≤ RM{income_ceiling_rm:,.0f}）"
    return f"(income ≤ RM{income_ceiling_rm:,.0f})"


# ---------------------------------------------------------------------------
# Dispatch
# ---------------------------------------------------------------------------

_CATALOG: dict[SchemeId, dict[Variant, Callable[..., SchemeCopy]]] = {
    "str_2026": {"qualify": _str_2026_qualify, "out_of_scope": _str_2026_out_of_scope},
    "jkm_warga_emas": {
        "qualify": _jkm_warga_emas_qualify,
        "out_of_scope": _jkm_warga_emas_out_of_scope,
    },
    "jkm_bkk": {"qualify": _jkm_bkk_qualify, "out_of_scope": _jkm_bkk_out_of_scope},
    "lhdn_form_b": {"qualify": _lhdn_qualify, "out_of_scope": _lhdn_zero_saving},
    "lhdn_form_be": {"qualify": _lhdn_qualify, "out_of_scope": _lhdn_zero_saving},
    "i_saraan": {"qualify": _i_saraan_qualify, "out_of_scope": _i_saraan_out_of_scope},
    "perkeso_sksps": {
        "qualify": _perkeso_sksps_qualify,
        "out_of_scope": _perkeso_sksps_out_of_scope,
    },
    "budi95": {"qualify": _budi95_qualify, "out_of_scope": _budi95_out_of_scope},
    "mykasih": {"qualify": _mykasih_qualify, "out_of_scope": _mykasih_out_of_scope},
    "peka_b40": {"qualify": _peka_b40_qualify, "out_of_scope": _peka_b40_out_of_scope},
    "bap": {"qualify": _bap_qualify, "out_of_scope": _bap_out_of_scope},
    "bantuan_elektrik": {
        "qualify": _bantuan_elektrik_qualify,
        "out_of_scope": _bantuan_elektrik_out_of_scope,
    },
    "i_suri": {"qualify": _i_suri_qualify, "out_of_scope": _i_suri_out_of_scope},
    "mysalam": {"qualify": _mysalam_qualify, "out_of_scope": _mysalam_out_of_scope},
    "sara": {"qualify": _sara_qualify, "out_of_scope": _sara_out_of_scope},
    "rmt": {"qualify": _rmt_qualify, "out_of_scope": _rmt_out_of_scope},
    "spbt": {"qualify": _spbt_qualify, "out_of_scope": _spbt_out_of_scope},
    "kwapm": {"qualify": _kwapm_qualify, "out_of_scope": _kwapm_out_of_scope},
    "perkeso_sip": {"qualify": _perkeso_sip_qualify, "out_of_scope": _perkeso_sip_out_of_scope},
    "taska_permata": {
        "qualify": _taska_permata_qualify,
        "out_of_scope": _taska_permata_out_of_scope,
    },
}


def scheme_copy(
    scheme_id: SchemeId,
    variant: Variant,
    language: SupportedLanguage,
    **vars: Any,
) -> SchemeCopy:
    """Return the `(summary, why_qualify)` pair for a rule's emitted SchemeMatch.

    Raises `KeyError` if the dispatch table is missing an entry — the
    `test_rule_copy_coverage` test catches that at CI time so a new scheme
    can't ship without translations.
    """
    return _CATALOG[scheme_id][variant](language, **vars)


__all__ = [
    "SchemeCopy",
    "Variant",
    "bkk_breakdown",
    "bkk_cap_note",
    "out_of_scope_reason",
    "scheme_copy",
    "sksps_ceiling_note",
]
