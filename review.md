# InboxIQ architecture and security review

**Review date:** 2026-10-10  
**Code reviewed:** `main` / `origin/main` at `9d5959d`  
**Method:** static source/configuration/migration review; production build; dependency audit; negative-path review. No production endpoints, databases, payment systems, user mailboxes, or local secret files were accessed. Findings about deployed configuration (Supabase grants, Vercel variables, Clerk settings, n8n credential store) require a follow-up environment review.

## Executive conclusion

The project has a sensible high-level division between Next.js, Clerk, Supabase, Google, Razorpay, n8n, and email delivery. It also contains several good controls: AES-256-GCM token encryption, server-side price selection, raw-body webhook HMAC checks, tenant-scoped database queries, and database-backed delivery locks.

It is **not ready for a production security sign-off**. A publicly known internal secret and a header-only cron trust check can give an attacker control-plane access. A missing/misconfigured Clerk publishable key makes the server treat every request as a built-in mock administrator. The only deployed cron schedule cannot fulfil per-user delivery times. Dependency and lockfile drift compound the risk.

## Findings (ordered by priority)

| ID | Severity | Area | Finding |
|---|---|---|---|
| F-01 | Critical | Internal auth | A real-looking fallback n8n secret is committed and accepted as a permanent credential. |
| F-02 | Critical | Authentication | Clerk configuration absence/invalidity switches production server routes to an admin mock user. |
| F-03 | Critical | Cron | A caller can set `x-vercel-cron: 1`; this is accepted without a secret. Combined with F-01, force-dispatch and PII response disclosure are possible. |
| F-04 | High | Availability / product correctness | Vercel runs the dispatcher once daily at 00:00 UTC, while code needs a 45-minute per-user local-time window. Most briefings will never dispatch. |
| F-05 | High | Supply chain | `npm audit` reports 13 production vulnerabilities: 1 critical and 8 high. Declared and resolved dependency versions do not agree. |
| F-06 | High | Supabase | Three `SECURITY DEFINER` RPCs are created in `public` without a fixed `search_path`, authorization checks, or `REVOKE EXECUTE FROM PUBLIC`. |
| F-07 | High | Workflow webhook | The n8n completion endpoint accepts an unsigned callback based only on a recent `execution_id` plus `user_id`; it then writes execution/report state. |
| F-08 | High | Billing | Payment verification trusts the client-provided order/subscription/payment IDs after HMAC verification and does not retrieve the object from Razorpay to validate ownership, amount, currency, and state. Webhook events are not durably deduplicated or ordered. |
| F-09 | Medium | Error/PII exposure | Cron responses expose user IDs, email addresses, and internal dispatch outcomes; some 500-level `AppError` database text can reach clients. |
| F-10 | Medium | Reliability | In-memory rate limiting is per warm serverless instance and resettable; lock-RPC failures intentionally fall back to non-atomic checks. |
| F-11 | Medium | Feature mismatch | The Google Drive route is a no-op although OAuth and UI/schema describe report archival. Unauthorized errors are returned as successful responses with their message. |
| F-12 | Medium | Privacy / operations | Gmail metadata/snippets are sent to n8n/Gemini, but the repository has no retention/deletion policy, DPA/processor control, or enforceable data minimization boundary. |
| F-13 | Low | Engineering quality | There are no repository tests, `npm run lint` is invalid, and middleware is deprecated by the installed Next runtime. |

## Detailed evidence and remediation

### F-01 — committed internal control-plane secret (Critical)

**Evidence:** the fallback secret is present in `.env.example`, `lib/internal-auth.js`, `lib/n8n/client.js`, `app/api/cron/dispatch/route.js`, and multiple n8n workflow HTTP nodes. Git history also contains it. `verifyInternalAuth` accepts it as a direct bearer/key credential.

**Impact:** anyone with repository access can invoke internal Gmail fetch/send, n8n callback, Drive, and cron paths. These paths can read Gmail snippets and cause report emails. A later environment variable rotation does not remove this route because the hard-coded value remains valid.

**Fix now:** rotate the n8n secret and any secret that may have been shared with it. Remove all fallback/default credentials, including from historical workflow exports; use n8n credential variables instead. Require a configured secret at startup, use HMAC with timestamp plus a replay nonce persisted with a short TTL, and fail closed.

### F-02 — fail-open mock authentication (Critical)

**Evidence:** `lib/clerk/auth.js` returns `MOCK_DEV_USER` (role `admin`) whenever `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` is missing, placeholder, or contains `mock`. `middleware.js` similarly passes every request through when Clerk is not considered live.

**Impact:** a deployment missing or incorrectly naming its Clerk public key exposes authenticated APIs and admin routes as the mock admin. This is a configuration mistake with catastrophic effect.

**Fix now:** make mock auth conditional on `NODE_ENV === 'development'` *and* an explicit local-only flag. In production, validate all required auth configuration during boot and return 503/fail deployment on invalid configuration. Add an integration test that verifies unauthenticated production-mode requests receive 401/redirect.

### F-03 — spoofable cron identity (Critical)

**Evidence:** `app/api/cron/dispatch/route.js` sets `isVercelCron` solely from `req.headers.get('x-vercel-cron') === '1'`; any internet caller controls this header. It skips the secret check when this value is true. The response includes `results` containing target `user_id` and `user_email`.

**Impact:** unauthenticated forced/cadenced control-plane execution, billing email/dunning activity, n8n quota exhaustion, and PII in the response. With F-01, `?force=true` is also reachable via the known internal key.

**Fix now:** require `Authorization: Bearer ${CRON_SECRET}` for every request (including Vercel Cron); do not treat a header as authentication. Restrict the route at an edge/WAF layer if available. Remove per-user details from responses and logs.

### F-04 — impossible cron schedule (High)

**Evidence:** `vercel.json` schedules only `0 0 * * *`. The dispatcher only queues users whose local time is 0–44 minutes after `report_time`. Comments in the route describe a 30-minute cadence, but configuration does not implement it.

**Impact:** except users scheduled around 00:00 UTC, users will miss daily reports. The 45-minute window cannot compensate for a 24-hour scheduler.

**Fix:** run sufficiently frequently for the supported delivery precision (for example hourly with a >=60-minute window, or every 15/30 minutes subject to plan limits), or use a dedicated scheduler/queue. Test daylight-saving transitions and record the actual delivery SLO.

### F-05 — vulnerable and unreproducible dependency state (High)

**Evidence:** `npm audit --omit=dev --json` found 13 production vulnerabilities (critical: 1; high: 8; moderate: 4), including Next.js, Clerk, Nodemailer, PostCSS, and Google API dependency chains. `package.json` declares `next: ^14.2.20` and `googleapis: ^144.0.0`, while `npm ls --depth=0` reports installed `next@16.3.4` and `googleapis@178.1.1` as invalid. Build uses Next 16.3.4.

**Impact:** the build is not deterministic and the resolved Next version remains affected by reported critical/high advisories. Security fixes cannot be relied upon across CI/deployments.

**Fix now:** decide the supported Next major, upgrade to a non-vulnerable release (audit identifies 16.4.0 as available), upgrade Clerk/Nodemailer/Google APIs to patched compatible versions, regenerate and commit `package-lock.json` with `npm ci`, and gate CI on `npm audit --omit=dev --audit-level=high` plus `npm ls`.

### F-06 — unsafe Supabase `SECURITY DEFINER` RPCs (High)

**Evidence:** migrations 005 and 006 define `public.claim_daily_briefing_dispatch`, `public.claim_email_delivery_lock`, and `public.claim_reminder_dispatch_lock` as `SECURITY DEFINER`. They do not set a safe `search_path`, check a caller identity/role, or revoke default `PUBLIC` execution.

**Impact:** if the Supabase Data API exposes these RPCs to `anon`/`authenticated` (the PostgreSQL default execute grant is `PUBLIC`), callers can manipulate report/delivery locks for arbitrary UUIDs. `SECURITY DEFINER` also makes unsafe name resolution a privilege-escalation risk.

**Fix now:** move internal RPCs to a non-exposed schema or replace them with a server-only transaction. Otherwise explicitly set `search_path = pg_catalog, public`, schema-qualify all objects, `REVOKE EXECUTE ... FROM PUBLIC, anon, authenticated`, grant only a dedicated server role, and run Supabase security advisors against the deployed project. Verify RLS/REST grants in the dashboard; this repository cannot prove deployed policies.

### F-07 — unsigned n8n completion fallback (High)

**Evidence:** `app/api/n8n/webhook/route.js` treats a callback as valid when a queued/processing execution matching attacker-supplied `execution_id` and `user_id` started in the last 30 minutes, even when no signature validates. It can then set report delivery state and write untrusted error/summary fields.

**Impact:** execution identifiers leak through authenticated cron output/logs, and a timing/identifier disclosure lets an attacker forge a completion and corrupt report state or admin error records.

**Fix:** remove the unsigned fallback. Use a single signed request scheme (HMAC timestamp + nonce or mTLS), reject replayed nonces, validate status against an allowlist, and bind callback payload fields to the server-created execution record.

### F-08 — payment lifecycle lacks authoritative reconciliation (High)

**Evidence:** `app/api/verify-payment/route.js` verifies a client-provided HMAC then grants active access for a locally calculated 30-day period without fetching the Razorpay order/payment/subscription. `app/api/razorpay-webhook/route.js` calls its update path “idempotent,” but has no event-ID table/unique constraint and applies events without ordering protection.

**Impact:** payment state can drift from Razorpay; replayed or late failure events can overwrite a newer active state, and the app does not verify the payment belongs to the current user/expected order/plan/amount/currency before activation.

**Fix:** treat webhooks plus Razorpay API retrieval as authoritative. Persist Razorpay event IDs with a unique constraint and timestamps/versioning; apply only forward transitions. At checkout verification, retrieve the object and compare stored order/subscription ID, user note, amount, currency, and capture/authorization state in one database transaction.

### F-09 — PII and verbose errors in responses (Medium)

**Evidence:** cron returns user email/ID and n8n response detail per target. `formatSafeErrorResponse` exposes `AppError.message` unless specific string fragments match; callers interpolate database messages into `AppError` (for example account profile and cron query failures). The Drive stub catches authentication failures and returns `success: true` plus `error.message`.

**Impact:** callers of privileged routes receive unnecessary personal/internal information. Configuration, database schema, or vendor error details can escape when a new error string misses the block list.

**Fix:** return only a correlation ID and generic public category for all 5xx errors; allow-list public messages rather than block-listing secret words. Keep detailed errors server-side in a redacted log. Never include user emails/IDs/vendor bodies in HTTP results except where the requesting user needs their own record.

### F-10 — serverless reliability controls are not durable (Medium)

**Evidence:** `checkRateLimit` and contact-form limits use in-memory `Map`s. They are per process and bypassable by serverless concurrency/cold starts. On mutex RPC failure, dispatch and send routes use a non-atomic select/check fallback; the send fallback may proceed when no row exists.

**Impact:** rate limits do not resist distributed abuse, and a database permission/outage condition can cause duplicate work or email sends rather than a safe failure.

**Fix:** use durable rate limiting (Vercel/Upstash/Redis) keyed by user and trusted edge IP. Fail closed on idempotency-lock failure and send failed work to a durable retry queue/outbox; do not replace a database mutex with a check-then-act path.

### F-11 — Drive archival is not implemented (Medium)

**Evidence:** `app/api/internal/drive/upload/route.js` is deliberately a no-op, while Google Drive connection/OAuth/schema code remains and the described architecture promises archival.

**Impact:** users can authorize Drive expecting archival, but no reports are uploaded. The route masks auth/configuration failures as a successful skip.

**Fix:** either implement upload with clear status/retries and revoke the unused Drive scope, or remove Drive connection UI, OAuth scope, schema, and product claims. Return a truthful non-2xx error for unauthenticated internal calls.

### F-12 — third-party email-data boundary is undocumented/unenforced (Medium)

**Evidence:** Gmail headers, snippets, labels, and IDs are collected by the internal endpoint and the bundled n8n workflow processes them with Gemini. The repository contains prompt guardrails and HTML escaping, but no technical retention/deletion controls, processor contract reference, user consent/version record, or redaction/minimization policy.

**Impact:** mailbox-derived personal/confidential data is transferred to third parties without an auditable lifecycle. Prompt injection mitigations do not replace data governance.

**Fix:** minimise fields sent to the model, document and enforce retention/deletion, record consent and privacy-policy version, configure provider data controls, restrict n8n credentials/access, and test prompt-injection cases with adversarial mail content.

### F-13 — missing test and lint safety net (Low)

**Evidence:** no test files or test script were found. `npm run build` succeeds, but `npm run lint` fails because Next 16 no longer provides `next lint`; the build warns that `middleware` is deprecated in favour of `proxy`.

**Fix:** add ESLint explicitly and a working `lint` script; migrate the middleware convention when upgrading. Add route-level tests for authentication fail-closed behavior, HMAC/replay rejection, per-tenant authorization, webhook ordering, payment reconciliation, mutex failure, scheduler timing, and error redaction.

## Safe negative-path checks performed

| Scenario | Result |
|---|---|
| Production compile | Passed with Next 16.3.4; warning: deprecated middleware convention. |
| Lint command | Failed: `next lint` is not a valid command in the installed Next version. |
| Dependency integrity | Failed: installed Next and Google API package versions violate the declared root ranges. |
| Dependency vulnerabilities | Failed: 13 production findings, including 1 critical and 8 high. |
| Missing Clerk public key (code-path test) | Fails open to `MOCK_DEV_USER` admin rather than rejecting requests. |
| Forged Vercel cron header (code-path test) | Accepted solely from `x-vercel-cron: 1`; no secret required. |
| Missing/invalid Drive internal auth (code-path test) | Route returns HTTP-success-shaped `skipped` response with error message. |
| Internal HMAC replay (code-path test) | Timestamp window exists (5 minutes), but no nonce/event persistence prevents multiple replays inside it. |

## Strengths worth preserving

- Google refresh tokens are stored encrypted with AES-256-GCM and random 96-bit IVs.
- Payment amounts are calculated server-side rather than accepted from the client.
- Razorpay and Clerk webhooks read raw bodies and verify signatures before parsing/update paths.
- Tenant queries in internal Gmail/Google routes match database `user_id` plus connection slot.
- Report and reminder flows attempt atomic database locks and have expiry retry handling.
- Email HTML generated in the bundled n8n workflow escapes model/mail-derived values.

## Recommended remediation sequence

1. Immediately rotate the committed n8n credential; remove hard-coded defaults and secret-bearing workflow exports; patch F-02 and F-03 before the next deployment.
2. Upgrade/pin dependencies and regenerate the lockfile; repair lint/CI.
3. Lock down Supabase RPC execution and validate live RLS, exposed schemas, grants, and security advisors.
4. Replace unsigned n8n callback fallback; add durable idempotency/replay storage and payment event reconciliation.
5. Repair scheduler cadence and use a durable queue/rate limiter/outbox.
6. Decide whether Drive archive is a supported feature; then implement or remove it. Establish data-retention and third-party-processing controls.

## Out-of-repository verification required

- Confirm all potentially exposed secrets have been rotated in Vercel, n8n, Google, Razorpay, Clerk, SMTP, Supabase, and Git history/any forks.
- Inspect Supabase Data API exposure, `PUBLIC` grants, RLS policies, function configuration, and service-role key handling.
- Check Vercel protection/WAF/log access and actual cron authorization behavior.
- Verify Clerk production instance settings, session/JWT configuration, webhooks, and no mock-like variables exist.
- Inspect n8n credential storage, workflow activation/version, callback headers, execution retention, and Gemini data controls.
- Reconcile a test payment/refund/cancellation in Razorpay end-to-end using non-production credentials.

## Handoff: exact changes, access required, and acceptance checks

This section is intentionally operational. A follow-on agent can use it as the implementation backlog. **Do not deploy partial fixes for F-01/F-02/F-03; rotate credentials and deploy the code change together.**

### Access and authority needed before changing anything

| System | Minimum access | Why it is needed | Do not request/share in chat |
|---|---|---|---|
| GitHub repository | Write access to a protected feature branch and pull-request creation | Commit code, migration, workflow export, lockfile, and tests | Personal access token, SSH private key |
| Vercel project | Project member able to view/edit production and preview environment variables, Cron, deployments, runtime logs, and WAF/firewall | Rotate secrets, verify `CRON_SECRET`, inspect deployment settings/logs, and deploy safely | Raw environment values, Vercel tokens |
| n8n Cloud workspace | Owner/admin for credentials, workflows, executions, and variables | Rotate the internal secret, move headers to n8n credentials, activate the corrected workflow, inspect retention | n8n API key/credential plaintext |
| Supabase project | Owner/admin or a narrowly scoped database migration role plus read access to Security Advisors/API settings | Inspect actual grants/RLS and deploy/review the function hardening migration | Service-role key, database password/connection string |
| Clerk production instance | Admin access to instance configuration, webhooks, and session/JWT settings | Verify production key setup and rotate webhook secret if exposure is suspected | Clerk secret key, webhook secret |
| Google Cloud OAuth project | OAuth-client editor and consent-screen/verification access | Rotate client secret if exposure is suspected; remove Drive scope if not supported | Client secret, refresh tokens |
| Razorpay account | Test-mode and production webhook/payment read access; settings access for webhooks | Rotate webhook secret, replay/inspect test events, validate reconciliation | Key secret, webhook secret |
| SMTP provider | Credential rotation and test-delivery access | Rotate password if it was exposed and test notification delivery | SMTP password |
| Security/operations owner | Approval for production secret rotation, availability windows, retention policy, and incident process | Changes affect active automations, billing, and user communication | User mailbox content or production PII exports |

### Implementation plan

| Order | Work item | Repository changes | External changes/access | Acceptance criteria |
|---:|---|---|---|---|
| 0 | Preserve evidence and plan rotation | None; do **not** paste secrets into commits/issues | Security owner, GitHub/Vercel/n8n access | Rotation time and owners are agreed; no secret is copied to tickets or chat. |
| 1 | Eliminate F-01 secret exposure | Remove literal fallback values from `lib/internal-auth.js`, `lib/n8n/client.js`, `app/api/cron/dispatch/route.js`, `.env.example`, README, and `n8n/inboxiq_production_workflow.json`; ensure missing secret throws at runtime | Rotate `N8N_WEBHOOK_SECRET` in Vercel and n8n credential store; consider repository history rewrite only under an approved incident plan | `rg` finds no old value in tracked files; a missing secret returns safe 5xx and never authenticates; new signed calls work. |
| 2 | Fail Clerk closed | Restrict `MOCK_DEV_USER` to explicit local development only; in production throw a configuration error before handling requests | Confirm real Clerk publishable/secret keys on Vercel and production instance | A production-mode process with no/malformed Clerk key rejects `/dashboard`, `/api/account`, and admin API routes; local mock flow requires opt-in. |
| 3 | Protect cron | Delete `x-vercel-cron` as an auth factor; compare the authorization header with `CRON_SECRET` using a safe comparison; remove `?force=true` or require a separate admin-only signed invocation | Set a unique `CRON_SECRET` in Vercel; configure it for the cron job; optionally add WAF restriction | A forged header gets 401; a correct bearer token succeeds; public result never contains email/ID/detail. Vercel’s cron guidance specifically expects bearer-token verification. |
| 4 | Repair schedule/durable dispatch | Align `vercel.json` cadence with the code’s local-time delivery window, or move scheduling/retries to a durable queue/workflow | Vercel plan/settings or chosen queue provider; define delivery SLO | Test users in UTC, India, US DST, Europe DST receive exactly one delivery in the agreed window. Load test confirms no function timeout. |
| 5 | Harden Supabase RPCs | Create a new migration (do not edit applied migrations) that sets safe `search_path`, revokes `PUBLIC`/`anon`/`authenticated` execute rights, and grants only the intended role; preferably move functions outside `public` | Supabase migration/deployment rights; inspect API exposure/grants and run Advisors | Anonymous/authenticated API RPC attempts fail; service-role path works; Advisor warnings are resolved/accepted explicitly. |
| 6 | Replace workflow callback fallback | Delete the database-match-as-authentication branch in `app/api/n8n/webhook/route.js`; validate schema/status; persist nonce/event ID to reject replay | n8n header/credential update and test execution access | Unsigned, stale, malformed, repeated, or wrong-user callbacks return 401/400 and do not alter rows; one valid callback updates only its execution. |
| 7 | Make payment state authoritative | Add a payment-event table with unique Razorpay event ID and transition/version fields; retrieve payment/order/subscription from Razorpay before granting access; use one DB transaction | Razorpay test webhooks/API read access | Replaying, reordering, or mismatching payment events does not downgrade access or activate a wrong account. Test paid, failed, cancelled, refunded, and expired states. |
| 8 | Redact errors and outputs | Replace error block-listing with allow-listed public messages; remove PII/result details from cron/API outputs; redact before `system_errors`/alert webhooks | Logging/alert destination access to confirm retention and redaction | Synthetic DB/vendor/config failures expose no secret, URL, token, email, user ID, SQL, or stack trace to clients or alerts. |
| 9 | Make rate limits/idempotency durable | Replace in-process Maps with a shared rate limiter; remove non-atomic lock fallback and queue failed work for retry | Redis/managed rate-limit/queue provisioning and credentials | Concurrent invocations across independent instances cannot exceed limits or produce duplicate email. Lock outage fails safely and creates an observable retry record. |
| 10 | Decide Drive feature and data governance | Either implement real archive/upload status/retry or remove Drive OAuth/UI/schema/claims; add consent/version, retention/deletion, and vendor-data documentation/config | Product-owner decision, Google consent screen, n8n/Gemini privacy and retention settings, legal/security review | UI and privacy policy accurately match behavior; test archive or confirm Drive scope is absent; retention/deletion test has evidence. |
| 11 | Repair dependency/tooling baseline | Pin compatible package versions, update lockfile using a clean install, replace obsolete `next lint` with ESLint, update middleware convention | Package-registry/network access; CI configuration access | `npm ci`, `npm run build`, `npm run lint`, test suite, `npm ls`, and agreed audit threshold pass in clean CI. |
| 12 | Add regression coverage and observability | Add unit/integration tests for all acceptance criteria; add structured redacted logs, metrics, and alert routing | CI secrets for test-only integrations and observability project access | CI blocks regressions; alerts correlate requests without exposing PII; runbook exists for payments, cron, OAuth, and n8n failures. |

### Required new tests

The next agent should add and run these before requesting production deployment:

1. Production-mode auth with Clerk missing, placeholder, malformed, and valid keys.
2. Cron with no authorization, forged `x-vercel-cron`, wrong bearer, correct bearer, and force flag.
3. Internal endpoint with no signature, invalid signature, stale timestamp, replayed nonce, and valid HMAC.
4. n8n completion with an unsigned known execution ID, mismatched user, invalid status, duplicate delivery, and valid signed completion.
5. Supabase RPC calls using anon/authenticated/service identities, proving grants and tenant isolation.
6. Payment creation/verification/webhook sequence including duplicate, late, failed, refunded, cancelled, and mismatched order/user/amount/currency events.
7. Two simultaneous dispatch/send attempts; injected DB/RPC failure; retry/outbox recovery.
8. Scheduler matrix for India, UTC, North American DST, European DST, and midnight date boundaries.
9. Error-redaction tests containing bearer tokens, JWT-like strings, database errors, URLs, email addresses, and raw vendor errors.
10. Drive feature tests matching the selected product decision, plus Gmail/n8n data-minimization and prompt-injection fixtures.

### Audit boundary — what this report did and did not prove

The source tree, migrations, n8n export, local dependency state, build, lint command, and package audit were reviewed. Two pre-existing untracked environment files were deliberately not read or modified. This report does **not** prove the state of GitHub secret scanning, Git history outside the locally available clone, Vercel, Supabase, Clerk, n8n, Google Cloud, Razorpay, SMTP, DNS, firewall, logs, or actual customer data. Those systems require the access listed above and should be audited as part of the same remediation project.
