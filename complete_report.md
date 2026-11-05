# InboxIQ complete application report

**Prepared:** 5 November 2026 (Asia/Kolkata)  
**Scope:** local repository inspection, remote-reference refresh, source/configuration/migration review, and local validation. No deployment, database, user mailbox, payment account, or GitHub write was performed.

## 1. Executive status

InboxIQ is a Next.js SaaS that produces scheduled, AI-assisted Gmail briefings. Its application layers are present: public marketing/auth pages, onboarding, account settings, billing, Google OAuth, scheduler, native/n8n processing, admin operations, Supabase migrations, and automated security regression tests.

The application compiles and the current security regression suite passes. It is **not ready for a production security release** until the exposed shared automation secret is rotated and the high/critical dependency findings are remediated. Several important capabilities also require live-environment validation because source review cannot verify deployed settings.

## 2. Repository and synchronization status

| Item | Result |
|---|---|
| Local branch | `main` |
| Remote | `origin` → `https://github.com/raj983535/inboxIQ_SAAS.git` |
| Remote refresh | `git fetch origin --prune` completed successfully |
| Divergence after fetch | `0 ahead / 0 behind` (`HEAD` equals `origin/main`) |
| Current source revision | `116b6c87bef0f3aaaab8fbc2d2c5f752d894894f` |
| Latest commit | 30 October 2026, `fix: update n8n base url to axiaracompany3 across codebase` |
| Tracked application files | 60 under `app/`; 31 API route files; 9 SQL migrations |
| Remote writes | None. Nothing was committed, pushed, or uploaded. |

The checkout was clean before this review. The report and the local remediation described below are intentionally uncommitted.

## 3. Product and architecture

### User journey

1. A visitor views the public site, pricing, contact, and legal pages.
2. Clerk manages sign-up/sign-in; the server creates or reconciles a Supabase user/profile on the first authenticated request.
3. The user completes onboarding, selects profile/report preferences, and connects Gmail (up to two inboxes) and optionally Google Drive through Google OAuth.
4. Trial and subscription status control access. Razorpay creates/verifies orders or subscriptions and its webhook updates subscription state.
5. A protected Vercel cron route identifies eligible users, locks/queues work, and starts the external n8n workflow or the native execution engine.
6. Gmail data is fetched under the user's authorized connection, summarized, and delivered. Execution/report metadata is retained in Supabase. The admin console exposes health, users, connections, reports, workflows, subscription status, and error records.

### Main technical components

| Layer | Implementation | Purpose |
|---|---|---|
| Web app | Next.js 14 App Router, React 18, Tailwind | Public, authenticated, and admin UI plus route handlers |
| Identity | Clerk | Session identity and webhook-based user lifecycle |
| Data | Supabase/Postgres with RLS | Users, preferences, OAuth connections, reports, execution telemetry, billing events, queues/outbox |
| Email/AI automation | n8n export plus native engine | Scheduled Gmail collection, processing, report generation and callback handling |
| Google | OAuth, Gmail API, Drive API | User connection, email read/send, optional Drive capability |
| Billing | Razorpay | Plan/order/subscription handling and signed webhooks |
| Hosting/scheduling | Vercel configuration | Deployment and cron trigger |

## 4. Implemented functional surface

### Frontend and account features

- Public home, pricing, contact, privacy, terms, shipping, and refund pages.
- Clerk sign-up/sign-in routes and protected app layout.
- Onboarding, dashboard, settings, and billing screens.
- Theme provider, responsive navigation/sidebar/topbar, common button/input/card/modal/badge/alert components.
- Dedicated admin login/layout and pages for dashboard, users, user detail, subscriptions, connections, workflows, reports, errors, system health, and settings.

### Server/API features

- Account registration, profile/account retrieval, profile updates, report preferences, and trial claim/status.
- Google OAuth connect/callback and Gmail/Drive disconnect operations.
- Internal Gmail fetch/send routes protected by internal authentication.
- n8n trigger/callback and a native-engine fallback.
- Scheduled dispatch with report jobs/delivery locks.
- Razorpay order/subscription creation, signature verification, cancellation, and webhook processing.
- Clerk, Razorpay, and contact endpoints plus admin reporting/health APIs.

### Data model/migrations

Migrations `001` through `009` establish the initial schema, profile/subscription lifecycle, trial/expired states, atomic idempotency locks, security-definer hardening, payment events, and durable jobs/nonces/outbox. Migration `009` introduces `report_jobs`, `webhook_nonces`, and `email_outbox` to support durable execution and delivery patterns.

## 5. Security and reliability assessment

### Controls already present

- OAuth credentials use AES-256-GCM encryption helpers.
- Clerk authentication fails closed unless an explicit local-development mock switch is enabled.
- Cron, internal, and webhook credentials use scoped verification; cron cannot use the n8n/internal secret.
- Razorpay and Clerk webhook paths verify raw-body signatures.
- Payment-event rows provide deduplication/retry handling and subscriptions have an out-of-order monotonic-state guard.
- Scheduled workflows use database-backed lock/queue concepts.
- Tests cover missing secret handling, old-secret rejection, stale HMAC timestamps, auth scope separation, config health, payment signature checks, admin authorization, basic error redaction, email fail-closed behavior, and cross-tenant fixture boundaries.

### Critical and high-priority findings

1. **Committed automation secret — urgent external rotation required.** A literal n8n shared secret was present in the template and workflow export. It has been removed from the current working tree, but may remain in Git history and any previously imported workflow. Rotate `N8N_WEBHOOK_SECRET` in Vercel and n8n before deploying this change. Do not reuse the old value.
2. **Dependency audit fails: 15 vulnerabilities (1 critical, 9 high, 5 moderate).** The audit identifies critical/high Next.js findings plus high issues through Clerk, Nodemailer, `follow-redirects`, PostCSS, and source-map-js. `npm audit fix --force` proposes breaking upgrades (notably Next 16 and Clerk 7), so this needs a tested compatibility upgrade rather than an automatic production change.
3. **Workflow-secret deployment dependency.** The workflow export now references `{{$env.N8N_WEBHOOK_SECRET}}`. Verify that the n8n environment permits this expression and set the rotated value there; otherwise configure an n8n credential and reference that credential rather than reintroducing a literal.
4. **Replay protection is incomplete in the current request code.** Callback HMAC validates timestamps, and a nonce table exists in migration `009`, but `verifyInternalAuth` does not persist/use a nonce. A captured valid signed callback can be replayed within the five-minute tolerance. Require a signed nonce/event identifier and atomically claim it in `webhook_nonces` before updating execution/report state.
5. **Static fallback URLs and broad secret fallback need review.** `lib/n8n/client.js` falls back to a concrete n8n base URL and accepts the n8n, internal, or cron secret as an outbound n8n secret. Require explicit deployment configuration and use a single n8n-specific secret to avoid cross-service credential coupling.
6. **Drive product behavior differs from earlier product claims.** `/api/internal/drive/upload` deliberately returns a successful skipped response because Drive archival is disabled. The Drive connection/schema/UI/README should be aligned: either implement upload with truthful retries/status or remove the scope/connection/product promise.
7. **Some durability code is present but requires end-to-end proof.** Outbox/job/nonces tables are defined, yet successful database migration/application, RLS grants, cron authorization, webhook callbacks, n8n execution, and recovery behavior cannot be confirmed locally.

### Medium/quality items

- Lint reports nine `react-hooks/exhaustive-deps` warnings in dashboard/admin pages. They do not fail the build, but the fetch/refresh functions should be memoized or declared within the effect as appropriate.
- Node emits `MODULE_TYPELESS_PACKAGE_JSON` during the test runner because CommonJS test code imports ESM-style source. Resolve by choosing an explicit module strategy or a test runner/bundling configuration; do not blindly add `"type": "module"` without validating Next/tooling behavior.
- The test file exercises useful security helpers but is largely unit-like. It does not execute actual route handlers against a test database, Razorpay sandbox, Clerk, Gmail, n8n, or Vercel cron.
- In-memory rate limiting is unsuitable as the only production protection in serverless/multi-instance deployments; use a durable distributed limiter.

## 6. Local implementation completed in this review

No GitHub upload occurred. The following local, uncommitted changes were made:

| File | Change | Reason |
|---|---|---|
| `.env.example` | Replaced the committed n8n secret with a non-secret instruction placeholder | Prevents new deployments from copying an exposed credential |
| `README.md` | Replaced the sample n8n secret with setup guidance | Keeps documentation safe |
| `n8n/inboxiq_production_workflow.json` | Replaced five literal header values with `{{$env.N8N_WEBHOOK_SECRET}}` | Removes the secret from the exported workflow |
| `lib/config/server.js` | Treats placeholder/example/replace-with/mock/change-me configuration as unusable | Prevents placeholder-style production configuration from appearing healthy |
| `tests/security-and-regression.test.js` | Removed the old literal from tests and added placeholder-health coverage | Keeps the old secret out of tracked test data and protects the new config behavior |

**Important:** these source changes do not rotate a real production secret and do not erase repository history. Rotation and deployment must be coordinated with n8n/Vercel access.

## 7. Validation evidence

| Check | Result |
|---|---|
| Remote comparison | Clean, equal to `origin/main` before local changes |
| `npm test` before changes | 14/14 passed |
| `npm run lint` | Completed with 9 dependency warnings; no lint error |
| `npm run build` | Passed; 39 static pages generated |
| `npm ls --depth=0` | Dependency tree resolved at the direct dependency level |
| `npm test` after changes | **15/15 passed** |
| n8n export JSON parse | Passed |
| `git diff --check` | Passed (no whitespace errors) |
| Static search for removed secret in tracked working tree | No matches after remediation |
| `npm audit --omit=dev --audit-level=high` | Failed as expected: 15 findings (1 critical, 9 high, 5 moderate) |

The build happened before the final documentation/config/test-only modifications; those changes do not alter the compiled application route code. Run the full build once more before any release after the required secret rotation/configuration is available.

## 8. Recommended delivery plan

### Block release until complete

1. Generate and set a new high-entropy n8n secret in Vercel and n8n; update the imported workflow/credential and retire the exposed value everywhere.
2. Confirm the n8n expression works in the target n8n Cloud plan. If environment expressions are unavailable, use n8n credentials/variables that are not exported as literals.
3. Upgrade and test Next.js, Clerk, Nodemailer, Google API dependency chain, PostCSS, and transitive vulnerabilities. Keep this as a compatibility branch with `npm ci`, build, lint, route tests, and preview deployment validation.
4. Enforce nonce/event replay protection for signed n8n callbacks using the existing durable nonce table or a dedicated unique event table.
5. Review Supabase production RLS policies, exposed schemas, RPC grants, and applied migration history using the Supabase dashboard/security advisor.

### Next implementation tranche

1. Add route/integration tests for authorization, cron bearer auth, HMAC nonce replay, payment event ordering, tenant boundaries, concurrency/lock failures, error redaction, and timezone/DST delivery.
2. Replace process-memory rate limiting with a shared durable service and fail safely if locking/queue operations fail.
3. Decide the Drive feature: implement real archival and user-visible state/retry, or remove Drive scopes, UI, schema references, and claims.
4. Resolve the nine React hook dependency warnings and establish CI gates for test, lint, build, JSON/workflow validation, secret scanning, and an agreed audit threshold.
5. Perform a preview deployment with non-production Clerk/Supabase/Razorpay/n8n/Google credentials, then validate the end-to-end onboarding → OAuth → scheduled report → payment → admin-monitoring flow.

## 9. External checks still required

This report cannot prove the state of systems outside the local repository. Before production release, verify:

- Vercel environment variables, cron authorization, deployment protection, logs, and firewall/WAF.
- Supabase applied migrations, RLS, API exposure, function grants, backup/recovery, and service-role use.
- Clerk production instance keys, webhook URLs, session/JWT settings, and role metadata.
- n8n credential storage, activated workflow version, execution retention, callback authentication, and AI/data-retention controls.
- Google OAuth consent screen, production redirect URI, scope justification, token revocation, and Gmail/Drive behavior.
- Razorpay test and production webhooks, payment/order/subscription reconciliation, refund/cancellation behavior, and event replay handling.
- SMTP sender authentication and delivery/alert observability.

## 10. Current local file state

Modified but uncommitted: `.env.example`, `README.md`, `lib/config/server.js`, `n8n/inboxiq_production_workflow.json`, and `tests/security-and-regression.test.js`.  
Untracked local deliverable: `complete_report.md` (this file).  

No files have been staged, committed, pushed, or uploaded to GitHub.

## 11. Agent handoff: exact local implementation details

This section is the implementation handoff for the next agent. It covers **only the changes made during this review**. The base branch contains other existing application code that was inspected but not changed.

### Change map

| File | Current location | Exact change | Runtime effect | Follow-up required |
|---|---:|---|---|---|
| `.env.example` | lines 41–45 | Replaced a committed n8n secret with `replace-with-a-unique-32-byte-secret` and an instruction comment | New local/deployment setup cannot accidentally copy the old literal | Set a newly generated real secret only in secret storage; never in this file |
| `README.md` | lines 190–194 | Replaced its n8n secret sample with the same safe placeholder and storage instruction | Documentation no longer provides a reusable shared secret | Keep docs aligned if credential storage changes |
| `n8n/inboxiq_production_workflow.json` | header entries near lines 122, 162, 328, 368, 408 | Replaced each `x-inboxiq-secret` literal with `={{ $env.N8N_WEBHOOK_SECRET }}` | Each of the five workflow HTTP requests reads the n8n runtime variable instead of an exported hard-coded value | Add the rotated value to n8n and verify this expression is allowed in the target workspace before importing/activating |
| `lib/config/server.js` | lines 33–44, 73, 114 | Added `isUsableSecretOrConfigValue()` and used it in production validation and health output | Empty or obvious example values are treated as invalid/degraded rather than configured | Consider replacing the marker list with stricter per-variable format checks later |
| `tests/security-and-regression.test.js` | lines 38, 56, 262–270 | Replaced two obsolete test literals with `retired-example-secret`; added a configuration-health regression test | The old secret is no longer retained in test data; config placeholder detection is covered | Keep tests updated if placeholder validation markers change |

### Code-level behavior: configuration validation

`lib/config/server.js` now contains the following helper concept:

```js
function isUsableSecretOrConfigValue(value) {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return !['placeholder', 'mock', 'replace-with', 'your-', 'example', 'changeme']
    .some((marker) => normalized.includes(marker));
}
```

Two existing checks now call this helper:

1. `validateServerConfig()` throws in a production server runtime when any required configuration value is missing or looks like a placeholder.
2. `getServerConfigHealth()` reports that variable in `missing`, makes the category `degraded`, and sets `allValid` to `false`.

The validation does not log secret values. It only reports variable names. The helper deliberately runs after trimming and lowercasing, so marker matching is case-insensitive.

### Code-level behavior: n8n workflow

The workflow's five HTTP request header entries now use this exact n8n expression:

```json
{
  "name": "x-inboxiq-secret",
  "value": "={{ $env.N8N_WEBHOOK_SECRET }}"
}
```

This assumes the workflow runtime exposes `N8N_WEBHOOK_SECRET` to expressions. Before activation, an agent with n8n access must confirm that the Cloud workspace permits `$env` access. If it does not, the correct alternative is an n8n credential/variable mechanism that does not serialize the secret in the exported JSON. Do not replace the expression with a literal.

The Next.js internal-auth code accepts a valid configured n8n secret in the `x-inboxiq-secret` header. The workflow therefore remains compatible after the new environment variable is configured. No route handler or request-body contract was changed.

### Regression test added

The new test performs these exact steps:

1. Saves the existing process value for `N8N_WEBHOOK_SECRET`.
2. Temporarily assigns `replace-with-a-unique-32-byte-secret`.
3. Calls `getServerConfigHealth()`.
4. Asserts `N8N_WEBHOOK_SECRET` appears in `health.categories.AUTOMATION.missing`.
5. Restores or deletes the previous environment value.

It passed as part of `npm test`, producing **15/15 passing tests**.

### Safe deployment order for the current patch

1. Generate a brand-new high-entropy n8n secret outside the repository.
2. Set it in n8n under the variable/credential mechanism confirmed for the target workspace.
3. Set the identical value as `N8N_WEBHOOK_SECRET` in the Vercel environments that will run this build.
4. Import/update the workflow and run a non-production or controlled callback test.
5. Deploy the code only after the callback test succeeds.
6. Revoke/rotate the previous value. Treat it as compromised because it existed in tracked content and may exist in Git history, cloned workspaces, n8n imports, caches, or logs.

### Commands already run and expected results

```powershell
git fetch origin --prune          # refreshed references; no local/remote divergence
npm test                          # 15/15 passed after the patch
npm run lint                      # exits successfully; nine React hook warnings remain
npm run build                     # passed before this docs/config/test-only patch
node -e "JSON.parse(require('fs').readFileSync('n8n/inboxiq_production_workflow.json','utf8'))"
                                  # workflow JSON parsed successfully
git diff --check                  # no whitespace errors
npm audit --omit=dev --audit-level=high
                                  # intentionally fails: 15 dependency findings
```

### What the next agent must not assume

- The local code cannot confirm whether the n8n variable expression is enabled, whether the workflow is active, or whether the old secret has been rotated.
- The report does not authorize a GitHub push, production deployment, migration execution, billing operation, or credential update.
- The old secret has been removed from the present working tree, but not necessarily from Git history. History rewriting is a separate security/operations decision.
- The working tree is intentionally uncommitted. Before creating a commit, review all six local files, including this report, and decide whether `complete_report.md` should remain untracked/local as requested.
