#!/usr/bin/env bash
# Blind A/B pairs for critics (copy to tools/blind.sh). Engine-independent.
#   blind.sh pair <ours.png> <reference.png> <pair-name>   -> prints an isolated dir with A.png/B.png (give only this path to the critic)
#   blind.sh reveal <pair-name>                            -> prints the key (Director only)
# The key lives in studio/.keys/, which the settings.json deny rule hides from Read/Glob/Grep and from recognised
# file commands in Bash (cat, head, ...); critics have neither Bash nor Glob. This script reads it through its own
# process, so only whoever may run it - the Director - can reveal a pair.
set -eu
case "${1:-}" in
  pair)
    ours="$2"; ref="$3"; name="$4"
    dir=$(mktemp -d "${TMPDIR:-/tmp}/crucible-review-XXXXXXXX")
    if [ $(( $(od -An -N1 -tu1 /dev/urandom) % 2 )) -eq 0 ]; then cp "$ours" "$dir/A.png"; cp "$ref" "$dir/B.png"; k='{"A":"ours","B":"reference"}';
    else cp "$ref" "$dir/A.png"; cp "$ours" "$dir/B.png"; k='{"A":"reference","B":"ours"}'; fi
    mkdir -p studio/.keys && printf '%s\n' "$k" > "studio/.keys/$name.json"
    echo "$dir" ;;
  reveal)
    python3 -c 'import sys; print(open("studio/.keys/"+sys.argv[1]+".json").read().strip())' "$2" 2>/dev/null \
      || node -e 'console.log(require("fs").readFileSync("studio/.keys/"+process.argv[1]+".json","utf8").trim())' "$2" ;;
  *) echo "usage: blind.sh pair <ours.png> <reference.png> <name> | blind.sh reveal <name>" >&2; exit 2 ;;
esac
