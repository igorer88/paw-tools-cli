#!/bin/bash

if [ -z "$1" ]; then
  echo "Usage: $0 <name> [--path <path>]"
  echo "Example: $0 parse-int"
  echo "Example: $0 parse-int --path src/domains"
  exit 1
fi

NAME="$1"
PATH_ARG=""

if [ "$2" = "--path" ] && [ -n "$3" ]; then
  PATH_ARG="--path $3"
fi

pnpm nest g pipe "$NAME" $PATH_ARG
