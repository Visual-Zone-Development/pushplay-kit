#!/bin/sh
# Stands in for a native build: says how it was started, then waits like a running game.
echo "engine-export started with: $* (launcher: ${PUSHPLAY:-no})"
sleep 2
