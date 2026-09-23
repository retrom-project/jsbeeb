#!/usr/bin/env bash
set -euo pipefail

root=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
output=${1:?absolute empty output directory is required}
python3 "$root/.github/rpg-runtime/candidate_descriptor.py" prepare "$output"

tools_root="$root/../../retrom/.cache/tools"
node_binary=$(find "$tools_root" -type f -path '*/bin/node' -name node | sort | tail -1)
test -n "$node_binary"
export PATH="$(dirname "$node_binary"):$PATH"
node -e 'if (Number(process.versions.node.split(".")[0]) < 24) process.exit(1)'

cd "$root"
npm ci --ignore-scripts --no-audit --no-fund >/dev/null
npm run build >/dev/null

mkdir -p "$root/.retrom-build"
work=$(mktemp -d "$root/.retrom-build/jsbeeb-candidate.XXXXXX")
trap 'rm -rf "$work"' EXIT INT TERM
mkdir -p "$work/site"
# ROMs, discs, tapes, teletext, and Econet media are supplied through Retrom's
# content and BIOS inputs. None of those upstream sample/proprietary files ship.
cp -a dist/index.html dist/assets dist/images dist/sounds dist/favicon.ico "$work/site/"
find "$work/site" -type f -name '*.map' -delete
(
  cd "$work/site"
  find . -type f -print0 | sort -z > "$work/site-files"
  tar --null --verbatim-files-from -T "$work/site-files" \
    --mtime='@0' --owner=0 --group=0 --numeric-owner \
    --mode='u+rwX,go+rX,go-w' -cf "$work/site.tar"
)
gzip -n -c "$work/site.tar" > "$output/jsbeeb-site.tar.gz"
install -m 0644 LICENSE "$output/LICENSE"

python3 "$root/.github/rpg-runtime/candidate_descriptor.py" paths "$output" > "$work/source-files-all"
python3 - "$work/source-files-all" "$work/source-files" <<'PY'
import sys
from pathlib import Path
source = Path(sys.argv[1]).read_bytes().split(b'\0')
excluded = (b'public/roms/', b'public/discs/', b'public/tapes/', b'public/teletext/', b'public/econet/')
Path(sys.argv[2]).write_bytes(b'\0'.join(path for path in source if path and not path.startswith(excluded)) + b'\0')
PY
tar -C "$root" --null --verbatim-files-from -T "$work/source-files" \
  --mtime='@0' --owner=0 --group=0 --numeric-owner \
  --mode='u+rwX,go+rX,go-w' -cf "$work/source.tar"
gzip -n -c "$work/source.tar" > "$output/source.tar.gz"

python3 "$root/.github/rpg-runtime/candidate_descriptor.py" finalize "$output" --core-id jsbeeb
