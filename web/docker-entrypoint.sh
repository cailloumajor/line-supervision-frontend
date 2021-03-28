#!/bin/sh
set -e

# allow the container to be started with `--user`
if [ "$1" = 'webserver' ] && [ "$(id -u)" = '0' ]; then
	exec gosu web "$0" "$@"
fi

exec "$@"
