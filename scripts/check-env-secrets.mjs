#!/usr/bin/env node
/**
 * Pre-commit / CI helper: scan .env (if present) for real secret values.
 * Run via:  node scripts/check-env-secrets.mjs
 *
 * Returns non-zero exit code so git commit / CI fails if secrets found.
 * Add to .husky/pre-commit or package.json "prepare" script.
 */
import { existsSync, readFileSync } from 'fs';

const SUSPECT_PATTERNS = [
  /sk_live_[A-Za-z0-9]+/,      // Stripe live secret key
  /sk_test_[A-Za-z0-9]+/,      // Stripe test key (still a real key)
  /re_[A-Za-z0-9]{20,}/,       // Resend API key
  /sbp_[A-Za-z0-9]{30,}/,      // Supabase personal token
  /service_role\s*=\s*ey/i,     // Supabase service role JWT
  /SUPABASE_SERVICE_ROLE_KEY\s*=\s*ey/, // explicit
  /DATABASE_URL\s*=\s*postgres.*:[^@]+@/i, // Postgres with password in URL
];

const ENV_FILES = ['.env', '.env.local', '.env.production', '.env.staging'];

let found = false;

for (const file of ENV_FILES) {
  if (!existsSync(file)) continue;
  const lines = readFileSync(file, 'utf-8').split('\n');
  lines.forEach((line, i) => {
    if (line.trimStart().startsWith('#')) return; // skip comments
    for (const pattern of SUSPECT_PATTERNS) {
      if (pattern.test(line)) {
        console.error(
          `\n🚨 SECRETS DETECTED in ${file}:${i + 1}\n` +
          `   Line: ${line.slice(0, 60)}...\n` +
          `   DO NOT commit this file. Use Netlify / Vercel env var UI.\n`
        );
        found = true;
      }
    }
  });
}

if (found) {
  console.error('Aborting: real secrets found in env files.\n');
  process.exit(1);
} else {
  console.log('✓ No obvious secrets found in env files.');
}
