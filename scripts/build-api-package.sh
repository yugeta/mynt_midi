#!/usr/bin/env sh
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
SRC_API="$ROOT_DIR/src/js/api/mynt-api.js"
SRC_MIDI_DIR="$ROOT_DIR/src/js/midi"
OUT_DIR="$ROOT_DIR/api"
OUT_MIDI_DIR="$OUT_DIR/midi"

REQUIRED_MIDI_FILES="parser.js player.js json-converter.js"

echo "[build-api-package] Start"

if [ ! -f "$SRC_API" ]; then
  echo "[build-api-package] ERROR: Missing source API file: $SRC_API" >&2
  exit 1
fi

for file in $REQUIRED_MIDI_FILES; do
  if [ ! -f "$SRC_MIDI_DIR/$file" ]; then
    echo "[build-api-package] ERROR: Missing source MIDI file: $SRC_MIDI_DIR/$file" >&2
    exit 1
  fi
done

rm -rf "$OUT_DIR"
mkdir -p "$OUT_MIDI_DIR"

# Copy API and rewrite relative imports for standalone api/ distribution.
sed "s|from '../midi/|from './midi/|g" "$SRC_API" > "$OUT_DIR/mynt-api.js"

# Copy minimal runtime dependencies.
for file in $REQUIRED_MIDI_FILES; do
  cp "$SRC_MIDI_DIR/$file" "$OUT_MIDI_DIR/$file"
done

if grep -q "from '../midi/" "$OUT_DIR/mynt-api.js"; then
  echo "[build-api-package] ERROR: Import rewrite failed in $OUT_DIR/mynt-api.js" >&2
  exit 1
fi

echo "[build-api-package] Generated package:"
echo "  api/mynt-api.js"
for file in $REQUIRED_MIDI_FILES; do
  echo "  api/midi/$file"
done

echo "[build-api-package] Done"
