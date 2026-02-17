# Netlify Deployment Setup

This document explains how to configure environment variables for deploying this Next.js app to Netlify with Supabase Postgres.

## Required Environment Variables

Configure these in **Netlify Dashboard → Site Settings → Environment Variables**.

### 1. Supabase (Public - Browser-Safe)
These are safe to expose in the browser bundle:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Where to find:**
- Go to [Supabase Dashboard](https://app.supabase.com)
- Select your project → **Settings → API**
- Copy **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
- Copy **anon/public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 2. Supabase (Server-Only - Secret)
⚠️ **Never expose these in client code!** Mark as **secret** in Netlify:

```
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Where to find:**
- Supabase Dashboard → **Settings → API**
- Copy **service_role key** → `SUPABASE_SERVICE_ROLE_KEY`

### 3. Database (Prisma)
⚠️ **Secret** - Contains database password:

```
DATABASE_URL=postgresql://postgres.your-project:your-password@aws-0-eu-central-1.pooler.supabase.com:6543/postgres
```

**Where to find:**
- Supabase Dashboard → **Settings → Database**
- Under **Connection string**, select **Transaction mode** (port `6543` for Prisma)
- Click **Copy** and set as `DATABASE_URL`
- ⚠️ Replace `[YOUR-PASSWORD]` placeholder with your actual database password

**Why 6543 (Transaction mode)?**
- Prisma requires long-lived connections
- Port 5432 (Session mode) can timeout during migrations
- Port 6543 (Transaction pooler) is recommended for Prisma

### 4. Admin Access
Comma-separated list of admin emails (for authentication):

```
ADMIN_EMAILS=admin@example.com,other-admin@example.com
```

**Optional:**
```
ADMIN_REQUIRE_MFA=1
```
Set to `0` to disable mandatory MFA for admins (not recommended in production).

### 5. Site URLs
```
NEXT_PUBLIC_SITE_URL=https://your-site.netlify.app
NEXT_PUBLIC_BASE_URL=https://your-site.netlify.app
```

Used for generating absolute URLs in emails and auth redirects.

### 6. Klarna (Optional - for payments)
If you use Klarna integration:

```
KLARNA_USERNAME=your_klarna_username
KLARNA_PASSWORD=your_klarna_password
KLARNA_API_URL=https://api.playground.klarna.com
```

For production, use `https://api.klarna.com`.

---

## Build Settings

**Build command:**
```
npm run build
```

**Publish directory:**
```
.next
```

**Node version:** (in `netlify.toml` or under Build Settings)
```
NODE_VERSION=20
```

---

## Post-Deployment Steps

### 1. Run Database Migrations (First Deploy Only)
After the first successful deploy, run migrations:

```bash
# Locally or via Netlify CLI
npx prisma migrate deploy
```

Or seed initial data if needed:
```bash
npx prisma db seed
```

### 2. Configure Supabase Auth Redirects
Add your Netlify site URL to Supabase allowed redirects:

- Supabase Dashboard → **Authentication → URL Configuration**
- Add these to **Redirect URLs**:
  ```
  https://your-site.netlify.app/admin/reset
  https://your-site.netlify.app/admin/login
  http://localhost:3000/admin/reset
  http://localhost:3000/admin/login
  ```

### 3. Test Admin Password Reset Flow
1. Go to `https://your-site.netlify.app/admin/login`
2. Click **"Glömt lösenord?"**
3. Enter admin email (must be in `ADMIN_EMAILS`)
4. Check inbox → click reset link → set new password
5. Verify redirect back to login with success message

---

## Local Development

### Setup `.env` (for local dev)
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Fill in real values (same as Netlify env vars above).

### Generate Prisma Client
```bash
npm run prisma:generate
```

### Run Migrations (if needed)
```bash
npx prisma migrate dev
```

### Start Dev Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Troubleshooting

### "DATABASE_URL contains placeholder"
- Check that `DATABASE_URL` in Netlify doesn't contain `YOUR_PASSWORD` or other placeholders
- Get the real connection string from Supabase → Settings → Database

### "Authentication failed against database server"
- Verify database password is correct
- Check if IP restrictions are enabled in Supabase (should allow connections from Netlify IPs)

### "AAL2 session required" during password reset
- Password reset flow now uses server-side route handler (`/api/admin/reset-password`)
- Ensure `SUPABASE_SERVICE_ROLE_KEY` is set in Netlify
- Verify Supabase Auth redirects include your site URL

### Prisma client errors
- Run `npm run prisma:generate` after changing `schema.prisma`
- In Netlify, trigger a new deploy (client is generated during build)

---

## Security Checklist

- ✅ `.env` is in `.gitignore` (never commit secrets)
- ✅ `SUPABASE_SERVICE_ROLE_KEY` marked as **secret** in Netlify
- ✅ `DATABASE_URL` marked as **secret** in Netlify
- ✅ Supabase RLS (Row Level Security) enabled on sensitive tables
- ✅ Admin emails allowlisted via `ADMIN_EMAILS`
- ✅ MFA required for admin login (`ADMIN_REQUIRE_MFA=1`)

---

## References

- [Supabase Connection Pooling](https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooler)
- [Prisma with Supabase](https://www.prisma.io/docs/guides/database/supabase)
- [Netlify Environment Variables](https://docs.netlify.com/environment-variables/overview/)
