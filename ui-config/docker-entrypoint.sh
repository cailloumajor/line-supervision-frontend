#!/bin/sh
set -e

# allow the container to be started with `--user`
if [ "$1" = 'ui_config' ] && [ "$(id -u)" = '0' ]; then
	exec gosu ui-config "$0" "$@"
fi

exec "$@"
