#!/usr/bin/env bash
# Copies the shared files into both add-on folders, then packages each add-on
# into dist/<name>-<version>.zip, ready to load or submit for signing.
#
# Edit shared-settings.js, color-utils.js and styles.css in shared/ only;
# the copies in hours-0.4/ and minutes-0.4/ are overwritten by this script.
set -euo pipefail
cd "$(dirname "$0")"

SHARED_FILES=(shared-settings.js color-utils.js styles.css)

mkdir -p dist
for dir in hours-0.4 minutes-0.4; do
  for f in "${SHARED_FILES[@]}"; do
    cp "shared/$f" "$dir/$f"
  done

  name="${dir%-*}"
  version=$(sed -n 's/^ *"version": *"\([^"]*\)".*/\1/p' "$dir/manifest.json")
  out="dist/$name-$version.zip"

  rm -f "$out"
  (cd "$dir" && zip -qr "../$out" . -x "*.zip" -x ".*")
  echo "Built $out"
done
