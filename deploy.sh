#!/usr/bin/env bash
set -euo pipefail
npm ci
npm run check
# Apply reviewed database migrations before deploying dependent application code.
if [[ "${1:-}" == "--prod" ]]; then
  npx vercel --prod
else
  npx vercel
fi
