#!/usr/bin/env bash
set -euo pipefail

ssh \
  -i /home/daniel/amazon.ssh \
  -o ServerAliveInterval=30 \
  -o ServerAliveCountMax=120 \
  -o TCPKeepAlive=yes \
  ubuntu@44.219.174.82
