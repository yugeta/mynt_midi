#!/usr/bin/env sh
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
SRC_API="$ROOT_DIR/src/js/api/mynt-api.js"
SRC_MIDI_DIR="$ROOT_DIR/src/js/midi"
DIST_DIR="$ROOT_DIR/api"

REQUIRED_MIDI_FILES="parser.js player.js json-converter.js"

DIST_FILES="api/modules/mynt-api.js api/modules/parser.js api/modules/player.js api/modules/json-converter.js"

TMP_DIR="$(mktemp -d)"
cleanup(){
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT INT TERM

TMP_API_DIR="$TMP_DIR/api"
TMP_MODULE_DIR="$TMP_API_DIR/modules"
mkdir -p "$TMP_MODULE_DIR"

if [ ! -f "$SRC_API" ]; then
  echo "[check-api-package] ERROR: Missing source API file: $SRC_API" >&2
  exit 1
fi

for file in $REQUIRED_MIDI_FILES; do
  if [ ! -f "$SRC_MIDI_DIR/$file" ]; then
    echo "[check-api-package] ERROR: Missing source MIDI file: $SRC_MIDI_DIR/$file" >&2
    exit 1
  fi
done

issues=""

add_issue(){
  issue="$1"
  if [ -n "$issues" ]; then
    issues="$issues
- $issue"
  else
    issues="- $issue"
  fi
}

if [ ! -f "$DIST_DIR/modules/mynt-api.js" ]; then
  add_issue "Missing generated file: api/modules/mynt-api.js"
fi

for file in $REQUIRED_MIDI_FILES; do
  if [ ! -f "$DIST_DIR/modules/$file" ]; then
    add_issue "Missing generated file: api/modules/$file"
  fi
done

if [ -n "$issues" ]; then
  echo "[check-api-package] ERROR: API package files are missing:" >&2
  printf '%s\n' "$issues" >&2
  echo "Run: sh ./scripts/build-api-package.sh" >&2
  exit 1
fi

# Recreate expected package in temp location.
sed "s|from '../midi/|from './|g" "$SRC_API" > "$TMP_MODULE_DIR/mynt-api.js"
for file in $REQUIRED_MIDI_FILES; do
  cp "$SRC_MIDI_DIR/$file" "$TMP_MODULE_DIR/$file"
done

if ! cmp -s "$TMP_MODULE_DIR/mynt-api.js" "$DIST_DIR/modules/mynt-api.js"; then
  add_issue "Outdated file: api/modules/mynt-api.js"
fi

for file in $REQUIRED_MIDI_FILES; do
  if ! cmp -s "$TMP_MODULE_DIR/$file" "$DIST_DIR/modules/$file"; then
    add_issue "Outdated file: api/modules/$file"
  fi
done

if [ -n "$issues" ]; then
  echo "[check-api-package] ERROR: API package is out of sync:" >&2
  printf '%s\n' "$issues" >&2
  echo "Run: sh ./scripts/build-api-package.sh" >&2
  exit 1
fi

echo "[check-api-package] OK"
echo "[check-api-package] Checked files:"
for file in $DIST_FILES; do
  echo "  - $file"
done
