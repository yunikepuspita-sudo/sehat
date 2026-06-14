# SEHAT — Database ERD & Schema

Target datastore: **PostgreSQL** (OLTP) + **Redis** (cache/session) +
**pgvector/Qdrant** (RAG embeddings). All PHI columns are encrypted at rest
(AES-256) and the schema is row-level-security ready.

## Entity Relationship Diagram

```mermaid
erDiagram
  ORG_UNIT ||--o{ EMPLOYEE : employs
  EMPLOYEE ||--o| USER_ACCOUNT : has
  ROLE ||--o{ USER_ACCOUNT : grants
  EMPLOYEE ||--o{ HEALTH_CHECKIN : logs
  EMPLOYEE ||--o{ FITNESS_LOG : logs
  EMPLOYEE ||--o{ SCREENING_RESULT : completes
  EMPLOYEE ||--o{ SYMPTOM_SESSION : starts
  SYMPTOM_SESSION ||--o{ SYMPTOM_MESSAGE : contains
  SYMPTOM_SESSION ||--o{ DIFFERENTIAL : yields
  CONDITION ||--o{ DIFFERENTIAL : referenced_by
  EMPLOYEE ||--o{ MEDICATION : takes
  MEDICATION ||--o{ MED_INTAKE : tracks
  EMPLOYEE ||--o{ APPOINTMENT : books
  DOCTOR ||--o{ APPOINTMENT : attends
  APPOINTMENT ||--o| CONSULT_NOTE : produces
  EMPLOYEE ||--o{ OCC_METRIC : measured_by
  EMPLOYEE ||--o{ AUDIT_LOG : generates

  ORG_UNIT { uuid id PK; string name; uuid parent_id FK }
  EMPLOYEE { uuid id PK; string nip; string name; date dob; string sex; int height_cm; uuid org_unit_id FK }
  USER_ACCOUNT { uuid id PK; uuid employee_id FK; string sso_subject; uuid role_id FK; timestamptz last_login }
  ROLE { uuid id PK; string name; jsonb permissions }
  HEALTH_CHECKIN { uuid id PK; uuid employee_id FK; date day; int mood; int energy; int stress; text note }
  FITNESS_LOG { uuid id PK; uuid employee_id FK; date day; int steps; int water_ml; numeric sleep_hrs; numeric weight_kg }
  SCREENING_RESULT { uuid id PK; uuid employee_id FK; string instrument; int score; string level; string risk; timestamptz taken_at }
  SYMPTOM_SESSION { uuid id PK; uuid employee_id FK; string risk; timestamptz created_at }
  SYMPTOM_MESSAGE { uuid id PK; uuid session_id FK; string role; text content; timestamptz at }
  CONDITION { string icd11 PK; string name; string title; string base_risk }
  DIFFERENTIAL { uuid id PK; uuid session_id FK; string icd11 FK; int confidence }
  MEDICATION { uuid id PK; uuid employee_id FK; string name; string dose; jsonb times }
  MED_INTAKE { uuid id PK; uuid medication_id FK; date day; int slot_index; bool taken }
  DOCTOR { uuid id PK; string name; string specialty }
  APPOINTMENT { uuid id PK; uuid employee_id FK; uuid doctor_id FK; timestamptz slot; string reason; string status }
  CONSULT_NOTE { uuid id PK; uuid appointment_id FK; text recommendation; timestamptz at }
  OCC_METRIC { uuid id PK; uuid employee_id FK; date period; numeric overtime_hrs; numeric travel_fatigue; numeric burnout_index }
  AUDIT_LOG { uuid id PK; uuid actor_id FK; string action; string resource; jsonb meta; timestamptz at }
```

## Core schema (PostgreSQL DDL excerpt)

```sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE org_unit (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name      text NOT NULL,
  parent_id uuid REFERENCES org_unit(id)
);

CREATE TABLE employee (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nip         text UNIQUE NOT NULL,
  name        text NOT NULL,
  dob         date,
  sex         text CHECK (sex IN ('male','female')),
  height_cm   int,
  org_unit_id uuid REFERENCES org_unit(id),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE role (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text UNIQUE NOT NULL,          -- employee | hr | executive
  permissions jsonb NOT NULL DEFAULT '[]'
);

CREATE TABLE user_account (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid UNIQUE REFERENCES employee(id),
  sso_subject text UNIQUE NOT NULL,          -- OIDC `sub`
  role_id     uuid REFERENCES role(id),
  last_login  timestamptz
);

CREATE TABLE fitness_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES employee(id),
  day         date NOT NULL,
  steps       int DEFAULT 0,
  water_ml    int DEFAULT 0,
  sleep_hrs   numeric(3,1) DEFAULT 0,
  weight_kg   numeric(4,1),
  UNIQUE (employee_id, day)
);

CREATE TABLE screening_result (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES employee(id),
  instrument  text NOT NULL,                 -- phq9 | gad7 | who5 | burnout
  score       int NOT NULL,
  level       text,
  risk        text CHECK (risk IN ('low','medium','high')),
  taken_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE symptom_session (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES employee(id),
  risk        text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE condition (
  icd11      text PRIMARY KEY,               -- e.g. '1E32'
  name       text NOT NULL,
  title      text,
  base_risk  text
);

-- Medical KB embeddings for RAG
CREATE TABLE kb_chunk (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source    text,
  content   text,
  embedding vector(1536)
);
CREATE INDEX ON kb_chunk USING ivfflat (embedding vector_cosine_ops);

CREATE TABLE audit_log (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id  uuid,
  action    text NOT NULL,
  resource  text,
  meta      jsonb,
  at        timestamptz NOT NULL DEFAULT now()
);

-- Row-level security example (employees see only their own rows)
ALTER TABLE fitness_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_rows ON fitness_log
  USING (employee_id = current_setting('app.employee_id')::uuid);
```

## Anonymisation for analytics

HR/Executive analytics never query individual rows. A nightly job materialises
**k-anonymous** aggregates (minimum cohort size `k ≥ 10`) into
`analytics_unit_daily` and `analytics_org_daily`; cohorts below `k` are
suppressed. This mirrors the shipped PWA where HR/Executive views only ever read
pre-aggregated `WORKFORCE` data — never personal records.
