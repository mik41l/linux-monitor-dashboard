#!/bin/sh

set -eu

start_listener() {
  listener="$1"
  proto="$(printf '%s' "$listener" | cut -d: -f1)"
  host="$(printf '%s' "$listener" | cut -d: -f2)"
  port="$(printf '%s' "$listener" | cut -d: -f3)"

  if [ "$proto" = "tcp" ] && [ -n "$host" ] && [ -n "$port" ]; then
    nc -lk -s "$host" -p "$port" >/dev/null 2>&1 &
  fi
}

if [ "${DEMO_LISTENERS:-}" != "" ]; then
  OLD_IFS="$IFS"
  IFS=','
  for listener in $DEMO_LISTENERS; do
    start_listener "$listener"
  done
  IFS="$OLD_IFS"
fi

exec node packages/agent/dist/index.js
