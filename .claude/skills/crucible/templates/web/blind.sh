#!/usr/bin/env bash
# Prepare a blind A/B pair for a critic (copy to tools/blind.sh).
# blind.sh <ours.png> <reference.png> <pairDir>  -> pairDir/A.png, pairDir/B.png; the key goes to pairDir/../<pair>.key.json
set -eu
ours="$1"; ref="$2"; dir="$3"; mkdir -p "$dir"
if [ $((RANDOM % 2)) -eq 0 ]; then cp "$ours" "$dir/A.png"; cp "$ref" "$dir/B.png"; k='{"A":"ours","B":"reference"}';
else cp "$ref" "$dir/A.png"; cp "$ours" "$dir/B.png"; k='{"A":"reference","B":"ours"}'; fi
echo "$k" > "$(dirname "$dir")/$(basename "$dir").key.json"
echo "$dir"
