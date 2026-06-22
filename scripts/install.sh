#!/usr/bin/env bash
# Build Songsmith Studio and (re)install it into /Applications, then launch it.
# Builds only the .app bundle (skips the flaky Finder-scripted .dmg step).
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP_NAME="Songsmith Studio.app"
DEST="/Applications/$APP_NAME"
CLI="$ROOT/frontend/node_modules/.bin/tauri"

echo "==> ensuring JS deps"
[ -d "$ROOT/frontend/node_modules" ] || ( cd "$ROOT/frontend" && npm install )
[ -d "$ROOT/sidecar/node_modules" ]  || ( cd "$ROOT/sidecar"  && npm install )

echo "==> building mcp-shim (release — bundled into the app)"
cargo build --manifest-path "$ROOT/Cargo.toml" -p mcp-shim --release || exit 1

echo "==> tauri build (.app only)"
( cd "$ROOT/app/src-tauri" && "$CLI" build --bundles app ) || exit 1

BUILT="$ROOT/target/release/bundle/macos/$APP_NAME"
if [ ! -d "$BUILT" ]; then
  echo "!! build failed: $BUILT not found" >&2
  exit 1
fi

echo "==> quitting any running instance"
osascript -e 'quit app "Songsmith Studio"' 2>/dev/null || true
sleep 2
pkill -f "/Applications/$APP_NAME/Contents/MacOS/" 2>/dev/null || true
sleep 1

echo "==> installing to /Applications"
rm -rf "$DEST"
cp -R "$BUILT" "$DEST"
xattr -dr com.apple.quarantine "$DEST" 2>/dev/null || true

echo "==> launching"
open "$DEST"

# sanity: warn if an old build somehow shipped
if strings "$DEST/Contents/MacOS/songsmith-studio" 2>/dev/null | grep -qi gemma; then
  echo "!! WARNING: installed binary still references the old local-AI path." >&2
fi
echo "✓ Songsmith Studio installed to /Applications and launched."
