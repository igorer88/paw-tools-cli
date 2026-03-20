#!/bin/bash

if [ -z "$1" ]; then
  echo "Usage: $0 <name> [--path <path>]"
  echo "Example: $0 logging"
  echo "Example: $0 logging --path src/domains"
  exit 1
fi

NAME="$1"
PATH_ARG=""

if [ "$2" = "--path" ] && [ -n "$3" ]; then
  PATH_ARG="--path $3"
fi

pnpm nest g interceptor "$NAME" $PATH_ARG
