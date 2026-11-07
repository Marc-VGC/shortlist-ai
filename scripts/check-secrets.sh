#!/usr/bin/env bash
# Fails if anything that looks like a real API key is committed.
set -euo pipefail
PATTERN='sk-ant-[A-Za-z0-9_-]{20,}|sk-proj-[A-Za-z0-9_-]{20,}|sk-[A-Za-z0-9]{40,}|eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[A-Za-z0-9_-]{20,}'
if git grep -nIE "$PATTERN" -- . ':!package-lock.json' ':!scripts/check-secrets.sh'; then
  echo "❌ Possible secret found in tracked files. Move it to an environment variable."
  exit 1
fi
if git ls-files | grep -E '(^|/)\.env($|\.)' | grep -v '\.env\.example$'; then
  echo "❌ A .env file is tracked by git. Remove it with: git rm --cached <file>"
  exit 1
fi
echo "✅ No hardcoded secrets found."
