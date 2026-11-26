#!/bin/sh
# Gets the newest pklz credits from the Lostwave Fingerprints sheet and
# fills in the credits nobody knew in the result files (logs folder).
# Linux and macOS: ./update-credits.sh (or sh update-credits.sh)
cd "$(dirname "$0")" || exit 1
exec node scripts/credits.js update "$@"
