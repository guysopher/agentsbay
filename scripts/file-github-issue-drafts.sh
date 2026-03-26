#!/usr/bin/env bash
set -euo pipefail

DRAFTS_DIR="docs/github-issue-drafts"
DRY_RUN=0

for arg in "$@"; do
  case "$arg" in
    --dry-run)
      DRY_RUN=1
      ;;
    --drafts-dir=*)
      DRAFTS_DIR="${arg#*=}"
      ;;
    *)
      echo "Unknown argument: $arg" >&2
      echo "Usage: $0 [--dry-run] [--drafts-dir=path]" >&2
      exit 1
      ;;
  esac
done

if ! command -v gh >/dev/null 2>&1; then
  echo "gh CLI is required but not found." >&2
  exit 1
fi

if ! gh auth status -h github.com >/dev/null 2>&1; then
  echo "GitHub CLI is not authenticated. Run: gh auth login" >&2
  exit 1
fi

if [ ! -d "$DRAFTS_DIR" ]; then
  echo "Draft directory not found: $DRAFTS_DIR" >&2
  exit 1
fi

shopt -s nullglob
files=("$DRAFTS_DIR"/*.md)
shopt -u nullglob

if [ ${#files[@]} -eq 0 ]; then
  echo "No markdown drafts found in $DRAFTS_DIR" >&2
  exit 1
fi

created=0
for file in "${files[@]}"; do
  base="$(basename "$file")"
  if [ "$base" = "README.md" ]; then
    continue
  fi

  title="$(sed -n 's/^# //p' "$file" | head -n 1)"
  if [ -z "$title" ]; then
    echo "Skipping $file (missing H1 title)." >&2
    continue
  fi

  body_tmp="$(mktemp)"
  awk 'BEGIN{started=0} /^# / && started==0 {started=1; next} started==1 {print}' "$file" > "$body_tmp"

  echo "Processing: $base"
  echo "  title: $title"

  if [ "$DRY_RUN" -eq 1 ]; then
    echo "  dry-run: gh issue create --title \"$title\" --body-file \"$body_tmp\""
  else
    url="$(gh issue create --title "$title" --body-file "$body_tmp")"
    echo "  created: $url"
  fi

  rm -f "$body_tmp"
  created=$((created + 1))
done

if [ "$created" -eq 0 ]; then
  echo "No draft issues were processed." >&2
  exit 1
fi

echo "Processed $created draft issue(s)."
