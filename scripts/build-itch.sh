#!/usr/bin/env bash
set -euo pipefail

# Build the game and package the dist contents into a zip ready for itch.io upload.
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST_DIR="$ROOT_DIR/dist"
ZIP_NAME="${1:-goblin-grinder-itch.zip}"
ZIP_PATH="$ROOT_DIR/$ZIP_NAME"

cd "$ROOT_DIR"
npm run build

if [ ! -d "$DIST_DIR" ]; then
	echo "dist directory not found; build may have failed." >&2
	exit 1
fi

cd "$DIST_DIR"
rm -f "$ZIP_PATH"
zip -qr "$ZIP_PATH" .

echo "itch.io package ready at $ZIP_PATH"
