# SEHAT — Security & Privacy Architecture

Health data is highly sensitive PHI. SEHAT follows **Zero Trust**,
**defense-in-depth**, and **privacy-by-design**, aligned with UU PDP
(Perlindungan Data Pribadi) and good-practice mappings to ISO 27001 / HIPAA-like
safeguards.

## 1. Principles
- **Zero Trust:** never trust, always verify. Every request authenticated +
  authorized at the gateway *and* the service. No implicit network trust.
- **Least privilege:** RBAC + row-level security; HR/Executive get only
  k-anonymous aggregates (`k ≥ 10`), never individual PHI.
- **Privacy by design:** data minimisation, purpose limitation, on-device
  processing where possible (the shipped PWA keeps all PHI on the device).
- **Defense in depth:** WAF → gateway → service authz → DB RLS → encryption.

## 2. Identity & Access
- **SSO** via KPU IdP (OIDC/SAML). No passwords stored by SEHAT.
- **JWT** access tokens (short TTL, 15 min) + rotating refresh tokens stored in
  Redis with revocation list.
- **RBAC** roles: `employee`, `hr`, `executive` — enforced in the shipped PWA
  router (`routes[].roles`) and, in the target, at gateway + service layers.
- MFA enforced for HR/Executive roles.

## 3. Encryption
- **In transit:** TLS 1.3 everywhere; HSTS; mTLS between services in-mesh.
- **At rest:** **AES-256** for DB volumes + column-level encryption (pgcrypto)
  for PHI fields; object storage SSE-KMS.
- **Key management:** envelope encryption via KMS/Vault; keys rotated ≥ 90 days.

## 4. Audit & Monitoring
- Immutable `audit_log` for every read/write of PHI (actor, action, resource,
  timestamp, request id). Append-only, shipped to SIEM.
- Anomaly detection on access patterns; alerts on bulk export.
- Centralised, structured logging with PII redaction.

## 5. Application security
- Input validation (Pydantic / client sanitisation — see `esc()` in `app.js`).
- Output encoding to prevent XSS (all dynamic strings HTML-escaped).
- CSP, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`
  headers; Subresource Integrity for third-party assets.
- Rate limiting + bot protection at the gateway.
- Prompt-injection guardrails on the AI gateway (allow-listed tools, output
  schema validation, red-flag override that cannot be suppressed by user text).

## 6. Medical safety controls
- **Emergency override:** red-flag detection (`detectEmergency`) short-circuits
  triage to an emergency response regardless of model output.
- **Self-harm safeguard:** PHQ-9 item 9 escalates risk and surfaces the SEJIWA
  crisis line immediately.
- Persistent disclaimer: SEHAT is decision-support, **not** a diagnosis.

## 7. Data lifecycle & subject rights
- **Consent** captured at onboarding; granular per-purpose.
- **Export:** users can export their data (shipped PWA: `Export data (JSON)`).
- **Erasure:** right-to-be-forgotten (shipped PWA: `Hapus semua data lokal`;
  target: cascading soft-delete + crypto-shredding of keys).
- **Retention:** PHI retained only as long as necessary; aggregates anonymised.

## 8. Compliance-ready posture
- Data residency in Indonesia region.
- DPIA (Data Protection Impact Assessment) maintained.
- Vendor (telemedicine/LLM) data-processing agreements; PHI sent to LLM is
  minimised and pseudonymised; option for self-hosted models for full residency.

## 9. Shipped PWA security notes
Because the shipped build is static and client-side:
- **No server attack surface, no central PHI store** — data lives only in the
  user's browser `localStorage`, scoped per device.
- All rendered content is HTML-escaped; no `eval`, no remote code.
- Service worker only caches same-origin assets.
- This is the most privacy-preserving *and* cheapest posture; the trade-off is
  no cross-device sync, which the full backend adds with the controls above.
