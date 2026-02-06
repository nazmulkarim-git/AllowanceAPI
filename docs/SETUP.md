# Launch Guide (Forsig)

This repo contains:

- **Cloudflare Worker proxy**: `apps/worker`
- **Next.js dashboard**: `apps/dashboard`
- **Supabase schema**: `supabase/schema.sql`

---

## 0) Prerequisites

Install:

- Node.js 18+ (Node 20 recommended)
- Git
- Cloudflare account + Wrangler
- Upstash Redis (REST)
- Supabase project
- (Recommended) Vercel account for the dashboard

---

## 1) Unzip and install dependencies

```bash
unzip forsig.zip
cd forsig
npm install
```

---

## 2) Create Supabase project + run schema

1. Create a new Supabase project.
2. In Supabase dashboard → **SQL Editor** → run the file:

`supabase/schema.sql`

This creates tables, RLS, and a trigger to auto-create profiles.

3. In Supabase → **Authentication**:
   - Enable Email/Password.
   - For easiest testing, you can disable email confirmations.

---

## 3) Create Upstash Redis database

1. Create an Upstash Redis database.
2. Copy:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`

---

## 4) Generate secrets

You need **two** secrets shared by dashboard and worker:

### SERVER_ENCRYPTION_KEY_B64
32 random bytes base64.

Example (Node):
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### ALLOWANCE_KEY_PEPPER
Random long string:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

---

## 5) Configure the Dashboard env

Copy and fill:

```bash
cp apps/dashboard/.env.local.example apps/dashboard/.env.local
```

Set:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SERVER_ENCRYPTION_KEY_B64`
- `ALLOWANCE_KEY_PEPPER`

Run the dashboard locally:

```bash
npm --workspace apps/dashboard run dev
```

Open: http://localhost:3000

---

## 6) Configure the Worker env + deploy

Copy the example and edit:

```bash
cp apps/worker/wrangler.toml.example apps/worker/wrangler.toml
```

Fill:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `SERVER_ENCRYPTION_KEY_B64`
- `ALLOWANCE_KEY_PEPPER`
- `OPENAI_API_BASE` (default is fine)

Deploy:

```bash
npm --workspace apps/worker run deploy
```

Wrangler will output your Worker URL, e.g.:
`https://forsig.YOURNAME.workers.dev`

---

## 7) Onboard your first user (you)

1. Go to dashboard → **Sign up**
2. Dashboard → **Settings** → paste your OpenAI API key → Save
3. Dashboard → **Agents** → Add agent
4. Click agent → Generate allowance key
5. In your agent app, use:

- Base URL = your Worker URL
- API Key = allowance key

Example (OpenAI SDK style):
```bash
export OPENAI_BASE_URL="https://forsig.YOURNAME.workers.dev"
export OPENAI_API_KEY="sk_allow_..."
```

Then call:
- `/v1/chat/completions` (and any other `/v1/*` path is proxied)

---

## 8) Onboarding real users (simple path)

### A) Deploy dashboard
Recommended: **Vercel**
- Import repo
- Set env vars from `.env.local`
- Deploy

### B) Point users at your dashboard
- They sign up
- Add their provider key
- Create agent + allowance key
- Point their agents to your Worker URL

---

## Notes / Production hardening checklist

- Pricing table in Worker (`apps/worker/src/pricing.ts`) is a placeholder. Replace with DB-driven pricing or a provider billing API.
- Provider keys are encrypted at rest using `SERVER_ENCRYPTION_KEY_B64`, but **you** operate the server secret. For enterprise: integrate a dedicated secret manager or Supabase Vault.
- Add per-user rate limits, IP allowlists, and audit logs if you’ll serve teams.
- Consider streaming response proxying (SSE) as a next step for performance; current implementation proxies whole body.



---

## Streaming support

The Worker supports streaming (SSE) pass-through. If the client sets `"stream": true`, the Worker:
- Adds `stream_options.include_usage = true` (so OpenAI includes a usage object near the end of the stream)
- Proxies the stream as-is to the client
- Captures usage (if provided) and settles the ledger after the stream ends

If usage is not present, it falls back to the reserved amount.

---

## Per-request idempotency

For non-streaming requests, pass:
- `Idempotency-Key: <unique string>`

Behavior:
- First request stores an **in-progress** marker (2 minutes)
- If a second request arrives with the same key while in progress → `409`
- When the response completes, the Worker caches the response for 24h and returns the same cached response on repeats.

For streaming requests:
- the Worker prevents duplicate in-flight requests with the same key (returns `409`), but does **not** cache the streamed body.

---

## Agent webhooks when enforcement trips

In the agent policy, set:
- `webhook_url` (optional)
- `webhook_secret` (optional)

When the Worker blocks a request (circuit breaker, velocity cap, insufficient balance, frozen, or model gate), it POSTs:

Headers:
- `Content-Type: application/json`
- `X-Allowance-Webhook-Secret: <secret>` (if configured)

Body:
```json
{
  "event": "velocity_cap_exceeded",
  "agentId": "...",
  "model": "gpt-4o-mini",
  "reason": "Velocity cap exceeded. Please slow down.",
  "requestId": "optional",
  "timestamp": "2026-02-05T00:00:00.000Z"
}
```

---

## Deploy Dashboard on Render (monorepo)

### Option A (Recommended): Deploy only the dashboard folder as a Render Web Service

1. Push this repo to GitHub.
2. Render → **New** → **Web Service**
3. Connect the repo.
4. Configure:
   - **Root Directory**: `apps/dashboard`
   - **Runtime**: Node
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start`
   - **Node Version**: 20 (Render setting)

5. Add environment variables (Render → Environment):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SERVER_ENCRYPTION_KEY_B64`
   - `ALLOWANCE_KEY_PEPPER`

6. Deploy.

### Option B: Deploy whole monorepo from root

Root Directory: repo root  
Build: `npm install && npm --workspace apps/dashboard run build`  
Start: `npm --workspace apps/dashboard run start`

---

## Exact setup clicks: Cloudflare / Upstash / Supabase (quick checklist)

### Cloudflare Workers
1. Cloudflare Dashboard → **Workers & Pages**
2. Create Worker (or use Wrangler deploy)
3. If using Wrangler (recommended):
   - Install: `npm i -g wrangler`
   - Login: `wrangler login`
   - Deploy from `apps/worker`:
     - `cp wrangler.toml.example wrangler.toml`
     - fill vars
     - `wrangler deploy`

### Upstash Redis (REST)
1. Upstash Console → **Create Database** → Redis
2. Region: pick close to your majority users (or close to Cloudflare PoPs you expect)
3. Open DB → REST API:
   - Copy `UPSTASH_REDIS_REST_URL`
   - Copy `UPSTASH_REDIS_REST_TOKEN`

### Supabase
1. Supabase → New project
2. SQL Editor → run `supabase/schema.sql`
3. Auth → Providers → Email (enable)
4. Project Settings → API:
   - Copy **Project URL** → `NEXT_PUBLIC_SUPABASE_URL` and Worker `SUPABASE_URL`
   - Copy **anon public** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Copy **service_role** (server only) → Render `SUPABASE_SERVICE_ROLE_KEY` and Worker `SUPABASE_SERVICE_ROLE_KEY`

---

