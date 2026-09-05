# InboxIQ — AI-Powered Email Intelligence SaaS (Control Plane)

**InboxIQ** is a multi-tenant SaaS application that acts as the **Control Plane** for an automated AI email intelligence workflow. It aggregates up to 2 Gmail accounts, extracts priorities and action items via **Gemini AI**, delivers a concise executive briefing directly to Gmail every morning, and archives a PDF report to Google Drive.

---

## 1. System Architecture

```
                                  ┌─────────────────────────────┐
                                  │            USER             │
                                  │     Faculty / Executive     │
                                  └──────────────┬──────────────┘
                                                 │
                                                 ▼
                                  ┌─────────────────────────────┐
                                  │   InboxIQ Web (Next.js)     │
                                  │        Control Plane        │
                                  └──────┬───────────────┬──────┘
                                         │               │
                     ┌───────────────────┼───────────────┴───────────────────┐
                     ▼                   ▼                                   ▼
             ┌───────────────┐   ┌───────────────┐                   ┌───────────────┐
             │     Clerk     │   │   Supabase    │                   │   Razorpay    │
             │ Identity/Auth │   │ App Database  │                   │ Subscriptions │
             └───────────────┘   └───────┬───────┘                   └───────────────┘
                                         │
                                  ┌──────┴──────┐
                                  ▼             ▼
                            Google OAuth   Google Drive
                            (2 Inboxes)     (Archival)
                                  │             ▲
                                  ▼             │
                      ┌───────────────────────────────────┐
                      │      n8n Automation Engine        │
                      │        (Automation Plane)         │
                      └─────────────────┬─────────────────┘
                                        │
                                        ▼
                                 ┌──────────────┐
                                 │  Gemini AI   │
                                 │ Intelligence │
                                 └──────────────┘
```

### Separation of Responsibilities
* **Control Plane (Next.js + Clerk + Supabase + Razorpay)**: Manages authentication, tenant isolation, Google OAuth tokens (encrypted at rest with AES-256-GCM), schedule preferences, and subscription states.
* **Automation Plane (n8n + Gemini)**: Fetches emails in rolling 24-hour windows, normalizes and classifies priority items with Gemini, delivers the HTML email briefing, and saves the PDF into `Google Drive > InboxIQ > Daily Reports`.
* **Privacy Minimization**: Raw email bodies are **never warehoused** in Supabase. Only operational metadata and delivery status are stored.

---

## 2. Tech Stack

* **Framework**: Next.js 14+ (App Router, JavaScript/JSX)
* **Styling**: Tailwind CSS with dark/light/system theme switching (`next-themes`)
* **Identity**: Clerk Authentication (`@clerk/nextjs`) with dedicated Admin Role separation
* **Database**: Supabase PostgreSQL with Row Level Security (RLS) & relational constraints
* **Payments**: Razorpay Subscription Gateway (starting at ₹499 INR / month)
* **Google APIs**: Google OAuth2, Gmail API (Read/Send), Google Drive API (`drive.file` scope)
* **Token Security**: Node.js `crypto` with authenticated AES-256-GCM encryption
* **Automation**: External n8n engine with HMAC-SHA256 authenticated webhooks

---

## 3. Local Setup & Installation

### Step 1: Clone and Install Dependencies
```bash
cd e:/inboxIQ
npm install
```

### Step 2: Environment Variables Configuration
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Fill `.env.local` with your credentials:
```env
# 1. Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/onboarding

# 2. Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...

# 3. Razorpay
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...
RAZORPAY_WEBHOOK_SECRET=...
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_...

# 4. Google OAuth
GOOGLE_CLIENT_ID=...apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=http://localhost:3000/api/google/callback

# 5. Token Encryption Key (32-byte hex)
# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
TOKEN_ENCRYPTION_KEY=...

# 6. n8n Automation Engine Boundary
N8N_BASE_URL=https://n8n.yourdomain.com
N8N_WEBHOOK_SECRET=...

# 7. App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Step 3: Run Database Migrations
Copy and execute the SQL migration in `supabase/migrations/001_initial_schema.sql` inside your Supabase SQL Editor.

### Step 4: Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 4. Google OAuth Setup

1. In the **Google Cloud Console** (APIs & Services):
   * Enable **Gmail API** and **Google Drive API**.
   * Configure the OAuth Consent Screen (External, adding test users for development).
   * Create **OAuth 2.0 Client IDs** (Web Application).
   * Add Authorized Redirect URI: `http://localhost:3000/api/google/callback` (and your production domain callback).
2. Required Least-Privilege Scopes:
   * Gmail: `https://www.googleapis.com/auth/gmail.readonly`, `https://www.googleapis.com/auth/gmail.send`, `https://www.googleapis.com/auth/userinfo.email`
   * Drive: `https://www.googleapis.com/auth/drive.file` (only files/folders created by InboxIQ)

---

## 5. Razorpay Subscription & Webhook Setup

1. In the **Razorpay Dashboard**:
   * Create a Monthly Plan of ₹499 INR.
   * Add a Webhook pointing to: `https://your-domain.com/api/razorpay-webhook`.
   * Enable events: `subscription.activated`, `subscription.charged`, `payment.captured`, `subscription.cancelled`, `subscription.halted`.
   * Copy the Webhook Secret to `RAZORPAY_WEBHOOK_SECRET`.

---

## 6. Dedicated Admin Portal

* **Admin Login Route**: `/admin/login`
* **Admin Dashboard**: `/admin/dashboard`
* **Features**:
  * Real-time metrics (Total users, active subscriptions, connected mailboxes, delivery rates)
  * User Directory with search and operational detail views (`/admin/users/[userId]`)
  * Subscription & Razorpay transaction monitoring (`/admin/subscriptions`)
  * Gmail & Google Drive connection health & revoked token tracking (`/admin/connections`)
  * n8n Workflow execution logs & duration telemetry (`/admin/workflows`)
  * Report delivery confirmations (`/admin/reports`)
  * Centralized system failure logs with correlation IDs (`/admin/errors`)
  * Service health checks (`/admin/system`)

---

## 7. Vercel Deployment

1. Push your repository to GitHub:
   ```bash
   git init
   git add .
   git commit -m "feat: complete InboxIQ SaaS control plane"
   git branch -M main
   git remote add origin <your-github-repo-url>
   git push -u origin main
   ```
2. Import the project into **Vercel**.
3. In Project Settings > **Environment Variables**, add all keys from `.env.local`.
4. Deploy!
