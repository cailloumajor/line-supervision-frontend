#!/bin/sh
set -e

# first arg is `-f` or `--some-option`
if [ "${1#-}" != "$1" ]; then
	set -- centrifugo "$@"
fi

# allow the container to be started with `--user`
if [ "$1" = 'centrifugo' ] && [ "$(id -u)" = '0' ]; then
	find . \! -user centrifugo -exec chown centrifugo '{}' +
	exec gosu centrifugo "$0" "$@"
fi

exec "$@"
