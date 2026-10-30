#!/usr/bin/env bash
# Fails if any tracked/staged file looks like the copyrighted source text.
# Run by .githooks/pre-commit and CI.
set -euo pipefail
bad=0
files=$(git diff --cached --name-only --diff-filter=ACM 2>/dev/null; git ls-files)
for f in $(echo "$files" | sort -u); do
  [ -f "$f" ] || continue
  case "$f" in
    *.epub|*.mobi|*.azw*|*.pdf|*Clarke*|*Piranesi*Bloomsbury*) echo "BLOCKED (filename): $f"; bad=1; continue;;
  esac
  # Distinctive strings from the book's front matter and a large-text heuristic.
  if grep -qiE "Bloomsbury Publishing|ALSO BY SUSANNA CLARKE|Jonathan Strange & Mr Norrell" "$f" 2>/dev/null \
     && [ "$f" != "scripts/check-no-source-text.sh" ]; then
    echo "BLOCKED (book front matter): $f"; bad=1
  fi
  if [ "$(wc -c <"$f")" -gt 150000 ] && file "$f" | grep -q text; then
    echo "BLOCKED (large text file, >150KB): $f"; bad=1
  fi
done
exit $bad
