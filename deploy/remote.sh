#!/usr/bin/env bash
# cd /home/daniel/Code/site-murm/deploy/
set -euo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"

"$DIR/remote.deploy.sh"
"$DIR/remote.run.sh"
