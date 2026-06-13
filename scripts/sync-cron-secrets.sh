#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

SECRET_FILE=$(mktemp)
trap 'rm -f "$SECRET_FILE"' EXIT

openssl rand -hex 32 > "$SECRET_FILE"
CRON_SECRET=$(cat "$SECRET_FILE")
VERCEL_APP_URL="https://politicalstocktracker.vercel.app"
REPO="duhitsrandy/politicalstocktracker"

vercel_add() {
  local name="$1" value="$2" sensitive="${3:-}"
  local extra=()
  if [ "$sensitive" = "1" ]; then extra+=(--sensitive); fi
  CI=1 VERCEL_TELEMETRY_DISABLED=1 npx vercel env add "$name" production \
    --value "$value" --yes --force "${extra[@]}" --non-interactive </dev/null
}

echo "== Vercel production env =="
vercel_add CRON_SECRET "$CRON_SECRET" 1
vercel_add NEXT_PUBLIC_APP_URL "$VERCEL_APP_URL" 0

if [ -f .env.local ]; then
  while IFS= read -r line || [ -n "$line" ]; do
    case "$line" in
      SUPABASE_SERVICE_ROLE_KEY=*|FINNHUB_API_KEY=*|ENABLE_SOURCE_POLLING=*|ENABLE_DISCORD_ALERTS=*|ENABLE_AI_CLASSIFIER=*)
        key="${line%%=*}"
        val="${line#*=}"
        val="${val%\"}"
        val="${val#\"}"
        vercel_add "$key" "$val" 1
        ;;
    esac
  done < .env.local
fi

echo "== GitHub Actions secrets =="
gh secret set CRON_SECRET -R "$REPO" < "$SECRET_FILE"
printf '%s' "$VERCEL_APP_URL" | gh secret set VERCEL_APP_URL -R "$REPO"

echo "== Verify =="
gh secret list -R "$REPO"
npx vercel env ls production

echo "== Redeploy production =="
CI=1 VERCEL_TELEMETRY_DISABLED=1 npx vercel deploy --prod --yes --non-interactive </dev/null

echo "SETUP_OK"
