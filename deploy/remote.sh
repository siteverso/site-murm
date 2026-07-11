#!/usr/bin/env bash
set -e

DIR="$(cd "$(dirname "$0")" && pwd)"

"$DIR/remote.deploy.sh"
"$DIR/remote.run.sh"