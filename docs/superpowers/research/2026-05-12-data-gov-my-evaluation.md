# data.gov.my Evaluation for Layak Phase 11 Discovery

## TL;DR

NOT USEFUL FOR DISCOVERY. The blocking issue is not API quality but source content: current `data.gov.my` mostly publishes structured statistics, aggregates, and a few program-adjacent indicators, not authoritative scheme rules for eligibility, benefit amounts, application channels, or caveats.

## What data.gov.my Actually Publishes

Current welfare-adjacent coverage on the main portal is thin and mostly non-rule-bearing.

- `epf_dividend` publishes annual EPF dividend rates only; it does not describe i-Saraan eligibility, government match mechanics, contribution thresholds, or application flow. Evidence: https://data.gov.my/data-catalogue/epf_dividend
- `pekab40_screenings` and `pekab40_screenings_state` publish daily screening counts for PeKa B40, with methodology text noting that recipients of government cash assistance are eligible. This is utilization/activity data, not program rules. Evidence: https://data.gov.my/data-catalogue/pekab40_screenings
- `fuelprice` publishes weekly fuel prices; its caveats mention BUDI 95 and SKPS subsidy changes, but the dataset is still a price series, not a scheme-rule record. Evidence: https://data.gov.my/data-catalogue/fuelprice and https://github.com/data-gov-my/datagovmy-meta/blob/main/data-catalogue/fuelprice.json
- `federal_finance_qtr_oe` and `federal_finance_year_oe` expose Federal operating expenditure by object, including a `subsidies-sa` bucket ("subsidies and social assistance"). This is budget aggregate data, not per-scheme rules or disbursement detail. Evidence: https://data.gov.my/data-catalogue/federal_finance_qtr_oe and https://github.com/data-gov-my/datagovmy-meta/blob/main/data-catalogue/federal_finance_qtr_oe.json
- `legal_advisory_services` plus its category / subcategory / branch variants match the keyword `bantuan` because they concern `Jabatan Bantuan Guaman`, but they are legal-aid service statistics, not welfare scheme definitions. Evidence: https://data.gov.my/data-catalogue/legal_advisory_services
- I found no current `data.gov.my` datasets for STR, JKM Warga Emas, JKM OKU, i-Saraan, PERKESO / SOCSO ASIP, BPN, BKM, MySTEP, or LHDN Form B tax relief rules. Evidence: main catalogue crawl at https://data.gov.my/data-catalogue plus repo search in https://github.com/data-gov-my/datagovmy-meta/tree/main/data-catalogue

The catalogue also exposes a machine-readable registry dataset, `datasets`, which lists all dataset IDs and metadata. That is useful for portal discovery, but it does not change the rule-content problem. Evidence: https://data.gov.my/data-catalogue/datasets

## API Capabilities

- Base URL: `https://api.data.gov.my`. Evidence: https://developer.data.gov.my/quickstart
- Auth: none required. Evidence: https://developer.data.gov.my/quickstart
- Rate limit: 4 requests per minute for `Data Catalogue` and 4 requests per minute for `OpenDOSM`. Evidence: https://developer.data.gov.my/rate-limit
- Public docs describe dataset access via `GET /data-catalogue?id=<slug>` and say dataset IDs are discovered from the catalogue page / dataset page sample query. Evidence: https://developer.data.gov.my/static-api/data-catalogue
- Public docs define generic filters `filter`, `ifilter`, `contains`, `icontains`, `range`, `sort`, `date_start`, `date_end`, `timestamp_start`, `timestamp_end`, `limit`, `include`, `exclude`. Evidence: https://developer.data.gov.my/request-query
- Public docs say default responses are a list of records, and `meta=true` wraps them as `{ "meta": ..., "data": [...] }`. Evidence: https://developer.data.gov.my/response-format
- Open-source backend code exposes an internal/site list endpoint at `/data-catalogue/` with `site`, `language`, `source`, `frequency`, `geography`, `demography`, `begin`, `end`, `category`, `subcategory`, and `search` query params, returning `{ total, source_filters, dataset }`. Evidence: https://github.com/data-gov-my/datagovmy-back/blob/main/data_catalogue/views.py and https://github.com/data-gov-my/datagovmy-back/blob/main/data_catalogue/urls.py
- Open-source backend code also exposes a retrieve endpoint at `/data-catalogue/<catalogue_id>` that returns metadata plus `data` rows and dropdown info. Evidence: https://github.com/data-gov-my/datagovmy-back/blob/main/data_catalogue/views.py and https://github.com/data-gov-my/datagovmy-back/blob/main/data_catalogue/serializers.py
- The `datasets` registry dataset exists and is described as being generated from the site's internal API. That means there is at least one machine-readable list-all source, even though the public developer docs do not document it as the primary discovery mechanism. Evidence: https://data.gov.my/data-catalogue/datasets and https://github.com/data-gov-my/datagovmy-meta/blob/main/data-catalogue/datasets.json

For the 5 sampled slugs, the documented row shapes are:

- `datasets`: rows contain `id`, `date_created`, `title_en`, `category_en`, `subcategory_en`, `title_bm`, `category_bm`, `subcategory_bm`, `source`, `frequency`, `geography`, `demography`, `dataset_begin`, `dataset_end`. Evidence: https://data.gov.my/data-catalogue/datasets
- `epf_dividend`: rows contain `date`, `conventional`, `shariah`. Evidence: https://data.gov.my/data-catalogue/epf_dividend
- `pekab40_screenings`: rows contain `date`, `screenings`. Evidence: https://data.gov.my/data-catalogue/pekab40_screenings
- `federal_finance_qtr_oe`: rows contain `date`, `object`, `value`. Evidence: https://data.gov.my/data-catalogue/federal_finance_qtr_oe
- `legal_advisory_services`: rows contain `tarikh`, `cawangan`, `kategori utama`, `sub kategori`, `jenis kes`, `jumlah`. Evidence: https://data.gov.my/data-catalogue/legal_advisory_services

I could confirm the query URLs from the public dataset pages, but I could not directly capture the live JSON bodies from this environment; the shapes above come from the public field definitions plus the documented response contract. Evidence: https://developer.data.gov.my/response-format

## Welfare-Relevant Datasets Found

| Slug                         | Agency                         | Last Updated     | Granularity                 | Type (RULES/STATS/DISBURSEMENT/OTHER) | Useful for Layak? (Y/N + 1-line reason)                                                              |
| ---------------------------- | ------------------------------ | ---------------- | --------------------------- | ------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `epf_dividend`               | EPF / KWSP                     | 2026-02-28 18:00 | National                    | STATS                                 | N - only annual dividend rates; no i-Saraan rules, match limits, or application path.                |
| `pekab40_screenings`         | ProtectHealth Corporation, MOH | 2026-05-12 10:00 | National                    | STATS                                 | N - utilization counts only; methodology mentions cash-assistance eligibility but not scheme rules.  |
| `pekab40_screenings_state`   | ProtectHealth Corporation, MOH | 2026-05-12 10:00 | State                       | STATS                                 | N - state-level screening counts only; not one of Layak's target schemes.                            |
| `fuelprice`                  | MOF                            | 2026-05-06 23:59 | National                    | OTHER                                 | N - fuel-price series; caveats mention BUDI 95 / SKPS but not as a rule dataset for Layak's scope.   |
| `federal_finance_qtr_oe`     | JANM                           | 2024-05-31 15:00 | National                    | OTHER                                 | N - operating expenditure aggregate; `subsidies-sa` is only a budget bucket, not scheme-level rules. |
| `federal_finance_year_oe`    | JANM                           | 2024-05-31 15:00 | National                    | OTHER                                 | N - annual operating expenditure aggregate; same problem as quarterly dataset.                       |
| `legal_advisory_services`    | JBG                            | 2026-01-29 11:00 | National / State / District | STATS                                 | N - matched because of `Bantuan Guaman`, but it is legal-aid service usage data.                     |
| `legal_advisory_category`    | JBG                            | 2026-01-29 11:00 | National / State / District | STATS                                 | N - legal-aid counts by category, unrelated to Layak scheme discovery.                               |
| `legal_advisory_subcategory` | JBG                            | 2026-01-29 11:00 | National / State / District | STATS                                 | N - legal-aid counts by subcategory, unrelated to Layak scheme discovery.                            |
| `legal_advisory_branch`      | JBG                            | 2026-01-29 11:00 | National / State / District | STATS                                 | N - legal-aid counts by branch, unrelated to Layak scheme discovery.                                 |

## GitHub Org Findings

- `datagovmy-meta` contains the actual catalogue registry as one JSON file per dataset under `data-catalogue/`, plus a `datasets.json` registry dataset and an `openapi/` subdirectory. This is the cleanest machine-readable source for discovery. Evidence: https://github.com/data-gov-my/datagovmy-meta/tree/main/data-catalogue and https://github.com/data-gov-my/datagovmy-meta/blob/main/data-catalogue/datasets.json
- `datagovmy-back` is generic and meta-driven. The loader clones the meta repo, validates each dataset manifest, reads `link_preview` or `link_parquet`, converts rows into database records, and serves them through shared list/retrieve views. I did not find ministry-specific ingestion code for KPWKM, JKM, KWSP, PERKESO, LHDN, MOF welfare schemes, or JPM cash-assistance pipelines. Evidence: https://github.com/data-gov-my/datagovmy-back/blob/main/data_gov_my/utils/meta_builder.py and https://github.com/data-gov-my/datagovmy-back/blob/main/data_gov_my/management/commands/loader.py
- `datagovmy-back` list endpoint code supports search and category filtering, but the public developer docs do not foreground that list endpoint; they tell users to discover IDs from the catalogue page. Evidence: https://github.com/data-gov-my/datagovmy-back/blob/main/data_catalogue/views.py and https://developer.data.gov.my/static-api/data-catalogue
- `datagovmy-docs` looks like a training / docs site scaffold (`content/docs` MDX app). I found no welfare-ministry ingestion guide and no docs mentioning KPWKM, JKM, KWSP, PERKESO, MOF welfare pipelines, or LHDN. Evidence: https://github.com/data-gov-my/datagovmy-docs and repo search results in that repo

## Fitness Assessment Against Layak's Needs

- Authoritative scheme RULES: not covered. I found no current `data.gov.my` datasets defining eligibility thresholds, benefit amounts, application URLs, or claimant caveats for STR, JKM Warga Emas / OKU, i-Saraan, ASIP / PERKESO, BPN, BKM, MySTEP, or LHDN reliefs. The nearest matches are `epf_dividend` (rates only), `pekab40_screenings` (screening counts), `fuelprice` (prices), and budget aggregates. Evidence: https://data.gov.my/data-catalogue, https://data.gov.my/data-catalogue/epf_dividend, https://data.gov.my/data-catalogue/pekab40_screenings
- Citation usable on result card: partial. Dataset pages are stable `gov.my` URLs and expose `Last updated` / `Next update`, so they can support a stable citation URL plus retrieval timestamp. The problem is authority of content, not URL stability. Evidence: https://data.gov.my/data-catalogue/epf_dividend and https://data.gov.my/data-catalogue/datasets
- Detect new schemes or rule changes on a poll cycle: partial. The `datasets` registry and the meta repo both provide stable diff targets for "new dataset appeared" or "dataset metadata changed"; individual dataset pages also expose `last_updated` and `next_update`. But this only helps if the scheme exists on the portal, and there is no scheme-rule versioning or changefeed for Layak's target set. Evidence: https://data.gov.my/data-catalogue/datasets, https://github.com/data-gov-my/datagovmy-meta/tree/main/data-catalogue
- Coverage across Layak's target schemes: not covered. No current portal dataset for STR, JKM Warga Emas / OKU, i-Saraan, ASIP / PERKESO, BPN, BKM, MySTEP, or LHDN Form B relief rules. EPF coverage is only dividend history, not i-Saraan. Evidence: https://data.gov.my/data-catalogue and https://github.com/data-gov-my/datagovmy-meta/tree/main/data-catalogue

## Recommended Phase 11 Architecture Adjustment

NO CHANGE.

Phase 11 should keep the current plan of watching authoritative scheme-source pages / PDFs from an allowlist and using those primary sources for extraction, moderation, and user-facing citations. `data.gov.my` is not strong enough to replace or materially improve `backend/app/agents/discovery.py`, the `discovered_schemes` schema, or the result-card citation strategy for the target schemes.

If the team wants a future low-risk experiment, do it outside the Phase 11 critical path:

- Watch `https://data.gov.my/data-catalogue/datasets` or the `datagovmy-meta/data-catalogue/` directory as a separate scouting signal for newly published welfare-adjacent datasets.
- Treat any hit as a human-research lead only, not as publishable scheme evidence.
- Do not route `data.gov.my` citations directly onto user result cards unless the dataset itself is the authoritative rule source, which I did not find for the target schemes.

## Open Questions / Gaps

- I could confirm the documented sample query URLs for candidate slugs, but I could not directly capture the live JSON response bodies from `api.data.gov.my` in this environment. Response shapes above therefore rely on the public field definitions plus the documented API contract.
- `archive.data.gov.my` still surfaces older JKM / OKU / warga emas datasets in search results, but I did not treat those legacy CKAN pages as current Phase 11 discovery sources because the request was about the current `data.gov.my` and its public API.
- I did not find an explicit public changelog or ETag / Last-Modified contract for individual data-catalogue records; only dataset-page `last_updated` / `next_update` fields and GitHub diffability were visible from this run.

## References

- https://data.gov.my/data-catalogue
- https://data.gov.my/data-catalogue/datasets
- https://data.gov.my/data-catalogue/epf_dividend
- https://data.gov.my/data-catalogue/pekab40_screenings
- https://data.gov.my/data-catalogue/federal_finance_qtr_oe
- https://data.gov.my/data-catalogue/legal_advisory_services
- https://developer.data.gov.my/
- https://developer.data.gov.my/quickstart
- https://developer.data.gov.my/rate-limit
- https://developer.data.gov.my/request-query
- https://developer.data.gov.my/response-format
- https://developer.data.gov.my/static-api/data-catalogue
- https://open.dosm.gov.my/
- https://open.dosm.gov.my/data-catalogue
- https://github.com/data-gov-my/datagovmy-meta
- https://github.com/data-gov-my/datagovmy-meta/tree/main/data-catalogue
- https://github.com/data-gov-my/datagovmy-meta/blob/main/data-catalogue/datasets.json
- https://github.com/data-gov-my/datagovmy-meta/blob/main/data-catalogue/epf_dividend.json
- https://github.com/data-gov-my/datagovmy-meta/blob/main/data-catalogue/pekab40_screenings.json
- https://github.com/data-gov-my/datagovmy-meta/blob/main/data-catalogue/pekab40_screenings_state.json
- https://github.com/data-gov-my/datagovmy-meta/blob/main/data-catalogue/fuelprice.json
- https://github.com/data-gov-my/datagovmy-meta/blob/main/data-catalogue/federal_finance_qtr_oe.json
- https://github.com/data-gov-my/datagovmy-meta/blob/main/data-catalogue/federal_finance_year_oe.json
- https://github.com/data-gov-my/datagovmy-meta/blob/main/data-catalogue/legal_advisory_services.json
- https://github.com/data-gov-my/datagovmy-meta/blob/main/data-catalogue/legal_advisory_category.json
- https://github.com/data-gov-my/datagovmy-meta/blob/main/data-catalogue/legal_advisory_subcategory.json
- https://github.com/data-gov-my/datagovmy-meta/blob/main/data-catalogue/legal_advisory_branch.json
- https://github.com/data-gov-my/datagovmy-meta/blob/main/data-catalogue/openapi/metadata_catalogue.json
- https://github.com/data-gov-my/datagovmy-back
- https://github.com/data-gov-my/datagovmy-back/blob/main/README.md
- https://github.com/data-gov-my/datagovmy-back/blob/main/data_catalogue/urls.py
- https://github.com/data-gov-my/datagovmy-back/blob/main/data_catalogue/views.py
- https://github.com/data-gov-my/datagovmy-back/blob/main/data_catalogue/serializers.py
- https://github.com/data-gov-my/datagovmy-back/blob/main/data_catalogue/models.py
- https://github.com/data-gov-my/datagovmy-back/blob/main/data_gov_my/urls.py
- https://github.com/data-gov-my/datagovmy-back/blob/main/data_gov_my/utils/meta_builder.py
- https://github.com/data-gov-my/datagovmy-back/blob/main/data_gov_my/management/commands/loader.py
- https://github.com/data-gov-my/datagovmy-docs
