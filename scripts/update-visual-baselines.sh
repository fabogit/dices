#!/usr/bin/env bash
set -euo pipefail

# Regenerate Playwright visual screenshot baselines inside the exact Linux
# container image used by CI so font rendering, anti-aliasing, and SwiftShader
# WebGL output remain byte-identical across local machines and CI runners.
#
# IMPORTANT: Never bind-mount host node_modules into the container; host symlinks
# and native binaries may not match Ubuntu Noble inside the container. Instead,
# we use an isolated Docker named volume at /work/node_modules.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
CI_WORKFLOW="${REPO_ROOT}/.github/workflows/ci.yml"

DEFAULT_IMAGE="mcr.microsoft.com/playwright:v1.65.0-noble"
NODE_MODULES_VOLUME="dices-playwright-node-modules"
PNPM_STORE_VOLUME="dices-playwright-pnpm-store"

if ! command -v docker >/dev/null 2>&1; then
  echo "Error: docker is required to update visual baselines in the CI Playwright container." >&2
  exit 1
fi

# Keep the container image tag aligned with .github/workflows/ci.yml.
CI_IMAGE="$(grep -Eo 'mcr\.microsoft\.com/playwright:v[0-9]+\.[0-9]+\.[0-9]+-[a-z0-9]+' "${CI_WORKFLOW}" | head -n 1 || true)"
PLAYWRIGHT_IMAGE="${CI_IMAGE:-${DEFAULT_IMAGE}}"

echo "Updating Playwright visual baselines using container: ${PLAYWRIGHT_IMAGE}"
echo "Repository root: ${REPO_ROOT}"
echo "Isolated node_modules volume: ${NODE_MODULES_VOLUME}"

docker run --rm --ipc=host \
  -v "${REPO_ROOT}:/work" \
  -v "${NODE_MODULES_VOLUME}:/work/node_modules" \
  -v "${PNPM_STORE_VOLUME}:/root/.local/share/pnpm/store" \
  -w /work \
  -e CI=true \
  "${PLAYWRIGHT_IMAGE}" \
  bash -lc '
    set -euo pipefail
    if ! command -v pnpm >/dev/null 2>&1; then
      corepack enable >/dev/null 2>&1 || npm install -g pnpm
    fi
    pnpm install --frozen-lockfile
    pnpm run build
    pnpm exec playwright test --update-snapshots "$@"
  ' -- "$@"
