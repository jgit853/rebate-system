#!/usr/bin/env bash
set -euo pipefail

echo "[deploy] Start deployment: $(date -Is)"

# Ensure node is available (server must have Node 22+ installed)
if ! command -v node >/dev/null 2>&1; then
  echo "[deploy] ERROR: node not found"
  exit 1
fi

# pnpm via corepack preferred
if ! command -v pnpm >/dev/null 2>&1; then
  echo "[deploy] pnpm not found, enabling corepack..."
  corepack enable
fi

echo "[deploy] Node version: $(node -v)"
echo "[deploy] pnpm version: $(pnpm -v)"

echo "[deploy] Installing dependencies..."
pnpm install --frozen-lockfile

# DB schema push (optional, skip if fails)
echo "[deploy] Pushing database schema..."
pnpm -s run db:push --if-present || echo "[deploy] WARN: db:push skipped or failed"

echo "[deploy] Building application..."
pnpm -s run build

# Restart service with PM2
if command -v pm2 >/dev/null 2>&1; then
  echo "[deploy] Restarting application with PM2..."
  if [ -f "ecosystem.config.js" ]; then
    pm2 startOrReload ecosystem.config.js --env production --update-env
  else
    # fallback: try package start script
    pm2 start pnpm --name rebate-system -- start
  fi
  pm2 save || echo "[deploy] WARN: pm2 save failed"
else
  echo "[deploy] WARN: pm2 not found; skipping process reload"
fi

echo "[deploy] Deployment completed: $(date -Is)"
