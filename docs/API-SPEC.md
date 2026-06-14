# SEHAT — API Specification (target backend)

REST over HTTPS, JSON, JWT Bearer auth. Base path `/api/v1`. All endpoints are
versioned and documented via OpenAPI (FastAPI auto-generates `/docs`).

> The shipped PWA does not call these — it runs the same logic client-side. This
> spec defines the contract for graduating to the FastAPI backend.

## Conventions
- **Auth:** `Authorization: Bearer <jwt>`; tokens issued by `auth-svc`.
- **RBAC:** each route lists allowed roles. `403` on role mismatch.
- **Errors:** RFC 7807 problem+json `{ "type","title","status","detail" }`.
- **Rate limit:** `429` with `Retry-After`.
- **Idempotency:** mutating POSTs accept `Idempotency-Key` header.

## Auth
| Method | Path | Roles | Body / Notes |
|---|---|---|---|
| POST | `/auth/sso` | public | `{ id_token }` from IdP → `{ access, refresh, user }` |
| POST | `/auth/refresh` | any | `{ refresh }` → new access token |
| GET  | `/auth/me` | any | current user + role + permissions |
| POST | `/auth/logout` | any | revoke refresh token |

## AI Symptom Checker
| Method | Path | Roles | Notes |
|---|---|---|---|
| POST | `/symptom/session` | employee | start session → `{ session_id, greeting }` |
| POST | `/symptom/session/{id}/message` | employee | `{ text }` → extracted symptoms, emergency flag, next question |
| POST | `/symptom/session/{id}/finalize` | employee | → differential[], `risk`, `triage_route` |

```jsonc
// POST /symptom/session/{id}/finalize  → 200
{
  "risk": "medium",
  "triage": { "action": "Jadwalkan telekonsultasi", "cta": "telemed" },
  "differential": [
    { "icd11": "1E32", "name": "Influenza", "confidence": 57, "advice": "..." },
    { "icd11": "CA00", "name": "Common Cold", "confidence": 60, "advice": "..." }
  ],
  "disclaimer": "Informasi edukatif, bukan diagnosis."
}
```

## Fitness & Check-in
| Method | Path | Roles | Notes |
|---|---|---|---|
| GET/PUT | `/fitness/today` | employee | steps/water/sleep/weight |
| GET | `/fitness/history?days=7` | employee | time series |
| GET | `/fitness/bmi` | employee | `{ bmi, category, risk }` |
| POST | `/checkins` | employee | `{ mood, energy, stress, note }` |

## Mental Health Screening
| Method | Path | Roles | Notes |
|---|---|---|---|
| GET | `/screening/instruments` | employee | PHQ-9/GAD-7/WHO-5/burnout definitions |
| POST | `/screening/{instrument}` | employee | `{ answers:[...] }` → `{ score, level, risk, critical }` |
| GET | `/screening/history` | employee | past results |

## Telemedicine
| Method | Path | Roles | Notes |
|---|---|---|---|
| GET | `/telemed/doctors` | employee | available doctors/slots |
| POST | `/telemed/appointments` | employee | `{ doctor_id, slot, reason, risk }` |
| PATCH | `/telemed/appointments/{id}` | employee | update status |
| GET | `/telemed/consults` | employee | history + recommendations |

## Medications
| Method | Path | Roles | Notes |
|---|---|---|---|
| GET/POST | `/medications` | employee | list/create |
| DELETE | `/medications/{id}` | employee | remove |
| POST | `/medications/{id}/intake` | employee | `{ day, slot_index, taken }` |

## HR Analytics (anonymous, aggregated; `k ≥ 10`)
| Method | Path | Roles | Notes |
|---|---|---|---|
| GET | `/analytics/workforce-score` | hr | weighted org health score |
| GET | `/analytics/burnout` | hr | burnout index + at-risk units |
| GET | `/analytics/disease-trends` | hr | aggregated complaint distribution |
| GET | `/analytics/units` | hr | per-unit health/participation |

## Executive
| Method | Path | Roles | Notes |
|---|---|---|---|
| GET | `/analytics/ohi` | executive | Organizational Health Index |
| GET | `/analytics/predictions` | executive | linear/ML projection of health & burnout |
| GET | `/analytics/wellbeing` | executive | strategic indicators |

## Power BI-compatible feeds
| Method | Path | Roles | Notes |
|---|---|---|---|
| GET | `/bi/health-index?format=odata` | hr, executive | OData v4 feed for Power BI |
| GET | `/bi/burnout?format=csv` | hr, executive | tabular export |

Auth for BI feeds uses a scoped service token; all access is written to
`audit_log`.
