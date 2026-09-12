# InboxIQ — Autonomous AI Email Intelligence Engine

<p align="center">
  <a href="https://www.inboxiq.online" target="_blank">
    <img src="https://img.shields.io/badge/Live_Website-https%3A%2F%2Fwww.inboxiq.online-0070F3?style=for-the-badge&logo=vercel&logoColor=white" alt="Live Site" />
  </a>
  <img src="https://img.shields.io/badge/Next.js-14.2-black?style=for-the-badge&logo=next.js&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/Supabase-PostgreSQL%20%2B%20RLS-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase" />
  <img src="https://img.shields.io/badge/Clerk-Identity%20%26%20Auth-6C47FF?style=for-the-badge&logo=clerk&logoColor=white" alt="Clerk" />
  <img src="https://img.shields.io/badge/Gemini_AI-2.0_Flash-4285F4?style=for-the-badge&logo=google&logoColor=white" alt="Gemini AI" />
  <img src="https://img.shields.io/badge/n8n-Workflow_Orchestration-EA4B71?style=for-the-badge&logo=n8n&logoColor=white" alt="n8n" />
  <img src="https://img.shields.io/badge/Razorpay-Subscriptions-02042B?style=for-the-badge&logo=razorpay&logoColor=3395FF" alt="Razorpay" />
</p>

---

## 🌐 Live Production Platform
> **Official SaaS Domain:** [https://www.inboxiq.online](https://www.inboxiq.online)  
> *Engineered for high-volume professionals, academic faculty, researchers, healthcare executives, and founders.*

---

## 📖 Table of Contents
1. [Overview](#-overview)
2. [Key Capabilities](#-key-capabilities)
3. [System Architecture](#-system-architecture)
4. [Separation of Concerns: Control Plane vs. Automation Plane](#-separation-of-concerns)
5. [Tech Stack](#-tech-stack)
6. [Security, Privacy & Zero-Knowledge Architecture](#-security--privacy-architecture)
7. [Environment Configuration & Safety Rules](#-environment-configuration)
8. [Local Development Setup](#-local-development-setup)
9. [Database Schema & Migrations](#-database-schema)
10. [Cron Dispatch & Delivery Guarantees](#-cron-dispatch--delivery-guarantees)
11. [Admin Command Center](#-admin-command-center)
12. [Deployment & Production Hosting](#-deployment--production-hosting)

---

## 💡 Overview

**InboxIQ** eliminates inbox overload by turning incoming chaos into an actionable, high-signal morning executive briefing. 

Instead of spending hours sifting through hundreds of unread newsletters, urgent queries, administrative memos, and transactional receipts, InboxIQ:
1. Synchronizes up to **2 separate Gmail accounts** per user securely via Google OAuth 2.0.
2. Extracts and analyzes unread messages across a rolling 24-hour window using **Google Gemini 2.0 Flash AI**.
3. Categorizes and prioritizes actions with **domain-specific intelligence** (e.g., Academic/Faculty, Executive/C-Suite, Healthcare, Tech).
4. Delivers a clean, responsive **HTML Executive Briefing** straight to your primary inbox at your chosen preferred local time.
5. Archives an audit-ready **Daily PDF Report** into your personal `Google Drive > InboxIQ > Daily Reports` folder.

---

## 🚀 Key Capabilities

* **Multi-Mailbox Aggregation**: Connect up to 2 active Google/Gmail inboxes under a unified profile.
* **Role-Specific AI Prompting**: Tailors email evaluation to the user's profession (urgent student inquiries for professors, contract deals for founders, patient escalations for clinics).
* **Guaranteed Scheduled Delivery**: Resilient hourly cron dispatch with in-flight execution locking (`queued` / `processing`) and idempotency checks to prevent duplicate deliveries while catching up on any missed windows.
* **3-Day Free Trial (No Card Required)**: Instant frictionless onboarding with full platform access, automatically transitioning to Razorpay subscription plans.
* **Non-Blocking Drive Archival**: Smart fault isolation ensures email briefing delivery is never blocked even if Google Drive PDF quota limits or permissions hit temporary external errors.
* **Hardware-Grade Cryptography**: All OAuth tokens and refresh credentials are encrypted at rest using AES-256-GCM with distinct initialization vectors (IV) and auth tags.
* **Full-Spectrum Admin Suite**: Complete real-time observability over active users, subscriptions, connected inboxes, n8n workflow telemetry, and system-wide error logs.

---

## 📐 System Architecture

```
                                  ┌─────────────────────────────┐
                                  │            USER             │
                                  │    Professional / Faculty   │
                                  └──────────────┬──────────────┘
                                                 │
                                                 ▼
                          ┌─────────────────────────────────────────────┐
                          │         InboxIQ SaaS Control Plane          │
                          │        (Next.js 14 App Router)              │
                          │         https://www.inboxiq.online          │
                          └──────┬───────────────┬───────────────┬──────┘
                                 │               │               │
             ┌───────────────────┼───────────────┴───────────────┼───────────────────┐
             ▼                   ▼                               ▼                   ▼
     ┌───────────────┐   ┌───────────────┐               ┌───────────────┐   ┌───────────────┐
     │  Clerk Auth   │   │ Supabase DB   │               │   Razorpay    │   │  Vercel Cron  │
     │ Sessions/RBAC │   │ Postgres+RLS  │               │ Subscriptions │   │ Hourly Runner │
     └───────────────┘   └───────┬───────┘               └───────────────┘   └───────┬───────┘
                                 │                                                   │
                         ┌───────┴───────────────────────────────┐                   │
                         ▼                                       ▼                   │
                  Google OAuth 2.0                        Google Drive API           │
                  (Tokens AES-256)                       (Audit PDF Archive)         │
                         │                                       ▲                   │
                         │                                       │                   │
                         ▼                                       │                   ▼
             ┌───────────────────────────────────────────────────┴───────────────────────┐
             │                     n8n Automation Engine                                 │
             │                    (Autonomous Execution)                                 │
             └─────────────────────────────────┬─────────────────────────────────────────┘
                                               │
                                               ▼
                                      ┌─────────────────┐
                                      │ Gemini 2.0 Flash│
                                      │ AI Intelligence │
                                      └─────────────────┘
```

---

## ⚡ Separation of Concerns

| Layer | Component | Core Responsibilities |
| :--- | :--- | :--- |
| **Control Plane** | Next.js 14, Clerk, Supabase, Razorpay | User onboarding, Google OAuth token exchange & AES-256-GCM encryption, preferences storage, schedule management, subscription billing, and Admin dashboard. |
| **Automation Plane** | n8n Engine, Gemini 2.0 Flash | Scheduled dispatch execution, rolling 24-hr email extraction, multi-tenant AI prompt assembly, HTML briefing generation, email delivery, and Google Drive PDF backup. |
| **Data Plane** | Supabase PostgreSQL | Secure profile states, connection metadata, encrypted tokens, delivery logs, and error telemetry protected by strict Row-Level Security (RLS). |

---

## 🛠 Tech Stack

* **Frontend & Core Framework**: [Next.js 14](https://nextjs.org/) (App Router, Server Components & Route Handlers)
* **Styling & Design System**: [Tailwind CSS](https://tailwindcss.com/) with dark/light theme switching via `next-themes`
* **Icons & UI Assets**: [Lucide React](https://lucide.dev/)
* **Authentication & Identity**: [Clerk](https://clerk.com/) with custom metadata role-based access control (RBAC)
* **Database & Storage**: [Supabase](https://supabase.com/) (Managed PostgreSQL 15 with RLS policies)
* **Payment Processing**: [Razorpay](https://razorpay.com/) (Subscription recurring plans, webhooks & signature verification)
* **Email & Drive Integrations**: Official `googleapis` (Gmail API `gmail.readonly` + `gmail.send`, Google Drive API `drive.file`)
* **Encryption Engine**: Native Node.js `crypto` with authenticated AES-256-GCM
* **Automation Workflow**: External [n8n](https://n8n.io/) orchestration with HMAC-SHA256 authenticated webhooks

---

## 🔒 Security & Privacy Architecture

### 1. Zero-Knowledge Email Handling
InboxIQ **never stores raw email bodies or email content** in Supabase. Email texts are extracted ephemerally during the scheduled execution run, processed in-memory by Gemini AI, formatted into an HTML summary, and delivered back to the user. Only operational delivery receipts (status, message count, timestamp) are recorded.

### 2. AES-256-GCM Token Encryption
All OAuth access and refresh tokens from Google are encrypted before persisting to the database. The encryption payload stores the ciphertext, a distinct 12-byte initialization vector (IV), and a 16-byte authentication tag to detect any tampering.

### 3. Row Level Security (RLS)
Supabase enforces tenant isolation at the PostgreSQL database level. A user cannot query or mutate records belonging to any other user, even in direct API interactions.

---

## ⚙️ Environment Configuration

### Why `.env.example` with Dummy Keys is Standard in Git:
> **Security Question:** *"Is it necessary to keep dummy details of env keys in the GitHub repository?"*
> 
> **Answer: YES, having a `.env.example` file with fake/dummy placeholders is an essential industry standard.**
> 
> * **Documentation for Developers & Deployments:** It tells Vercel, team members, and CI/CD pipelines *which variable names* the application expects without exposing any real values.
> * **Zero Risk:** `.env.example` contains only placeholders like `pk_test_...` or `0123456789abcdef...`. It contains zero active credentials.
> * **Safety Rule:** Real environment files (`.env`, `.env.local`, `.env.production`) are listed in `.gitignore` and **must NEVER be pushed to GitHub**. Real secrets live only in your local machine and in the **Vercel Project Environment Variables** dashboard.

### Template Reference (`.env.example`):
```env
# Application Domain
NEXT_PUBLIC_APP_URL=https://www.inboxiq.online

# 1. Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/onboarding

# 2. Supabase Database
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...

# 3. Google OAuth 2.0 (Gmail & Drive)
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-...
GOOGLE_REDIRECT_URI=https://www.inboxiq.online/api/google/callback

# 4. Token Encryption Key (32-byte / 64 hex character secret)
TOKEN_ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef

# 5. Razorpay Subscriptions
RAZORPAY_KEY_ID=rzp_live_...
RAZORPAY_KEY_SECRET=...
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_live_...
RAZORPAY_WEBHOOK_SECRET=...
RAZORPAY_PLAN_ID_FACULTY_INR=plan_...
RAZORPAY_PLAN_ID_STUDENT_INR=plan_...
RAZORPAY_PLAN_ID_PROFESSIONAL_INR=plan_...

# 6. n8n Automation Engine
N8N_BASE_URL=https://n8n.yourdomain.com
N8N_WEBHOOK_SECRET=inboxiq-n8n-shared-hmac-secret

# 7. Admin Access List
ADMIN_EMAILS=admin@inboxiq.online
```

---

## 💻 Local Development Setup

### 1. Clone the repository
```bash
git clone https://github.com/raj983535/inboxIQ_SAAS.git
cd inboxIQ_SAAS
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure local environment variables
```bash
cp .env.example .env.local
# Open .env.local and insert your development credentials
```

### 4. Run local database schema
Execute `supabase/migrations/001_initial_schema.sql` in your Supabase SQL Editor.

### 5. Launch the Next.js development server
```bash
npm run dev
```
Navigate to [http://localhost:3000](http://localhost:3000).

---

## ⏰ Cron Dispatch & Delivery Guarantees

InboxIQ uses a fault-tolerant multi-stage scheduling system to ensure every eligible user receives their briefing on time:

1. **Hourly Cron Trigger (`vercel.json`)**:
   Runs every hour (`0 * * * *`) hitting `/api/cron/dispatch`.
2. **Eligibility Filtering**:
   - Matches active subscribers and users currently in their **3-Day Free Trial**.
   - Validates user local timezone and matches preferred delivery hour (`currentTime >= scheduledTime`).
   - Ensures user has at least one active, authenticated Gmail connection.
3. **In-Flight Lock Protection**:
   Marks executing users with a `processing` status to prevent race conditions from concurrent cron invocations.
4. **Idempotency Guarantee**:
   Checks whether a successful delivery report already exists for the user on the current calendar date before dispatching.

---

## 🛡️ Admin Command Center

InboxIQ includes an enterprise-grade administration suite with route protection restricted to designated `ADMIN_EMAILS`:

| Route | Feature Area | Function |
| :--- | :--- | :--- |
| `/admin/dashboard` | Executive Overview | Real-time KPIs (Total Users, MRR, Active Inboxes, Delivery Success Rate). |
| `/admin/users` | User Directory | View profile statuses, trial expiry, connected mailboxes, and trigger manual reports. |
| `/admin/subscriptions` | Billing Engine | Live Razorpay subscription statuses, payments, and trial transitions. |
| `/admin/connections` | Gmail & Drive Health | Health status of OAuth tokens, token refresh events, and scope checks. |
| `/admin/workflows` | n8n Execution Logs | Execution timing, payload verification, and webhook status codes. |
| `/admin/reports` | Delivery Audits | History of all dispatched daily briefings with recipient email and item counts. |
| `/admin/errors` | System Telemetry | Centralized stack traces, correlation IDs, and failure alerts across all subsystems. |

---

## 🚢 Deployment & Production Hosting

1. **Vercel Production Deployment**:
   * Connect your GitHub repository (`raj983535/inboxIQ_SAAS`) to [Vercel](https://vercel.com).
   * Configure all environment variables from `.env.local` into the Vercel Dashboard.
   * Add custom domain: `www.inboxiq.online` (and redirect `inboxiq.online` to `www.inboxiq.online`).
2. **DNS Records (Cloudflare / Registrar)**:
   * `CNAME` record for `www` pointing to `cname.vercel-dns.com`.
   * `A` record for `@` pointing to `76.76.21.21`.
3. **Google Cloud OAuth Redirect**:
   * Ensure `https://www.inboxiq.online/api/google/callback` is added to **Authorized Redirect URIs** in Google Cloud Console.

---

<p align="center">
  <b>InboxIQ</b> — Crafted for focus, privacy, and actionable productivity.  
  <br />
  <a href="https://www.inboxiq.online"><b>Visit www.inboxiq.online →</b></a>
</p>
