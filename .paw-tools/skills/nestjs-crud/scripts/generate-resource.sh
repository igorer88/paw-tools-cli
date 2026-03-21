#!/bin/bash

if [ -z "$1" ]; then
  echo "Usage: $0 <name> [--path <path>]"
  echo "Example: $0 users"
  echo "Example: $0 users --path src/domains"
  exit 1
fi

NAME="$1"
PATH_ARG=""

if [ "$2" = "--path" ] && [ -n "$3" ]; then
  # Strip src/ prefix if present (Nest CLI expects path relative to src/)
  PATH_ARG="${3#src/}"
fi

pnpm nest g resource "$NAME" "$PATH_ARG" --no-spec
