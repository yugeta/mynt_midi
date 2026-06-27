#!/usr/bin/env sh
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"

git -C "$ROOT_DIR" config core.hooksPath .githooks

echo "[install-git-hooks] core.hooksPath set to .githooks"
echo "[install-git-hooks] pre-commit hook will run scripts/check-api-package.sh"
