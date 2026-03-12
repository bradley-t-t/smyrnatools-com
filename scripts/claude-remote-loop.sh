#!/usr/bin/env bash
# Runs claude in remote mode, restarting only when the process exits.

unset CLAUDECODE

while true; do
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting claude remote session..."

  expect -c '
    set timeout 30
    spawn claude remote-control
    expect "accept"
    sleep 2
    # Down arrow = ESC [ B
    send "\x1b\[B"
    sleep 1
    send "\r"
    set timeout -1
    expect eof
  '

  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Claude session ended — restarting..."
  sleep 2
done
