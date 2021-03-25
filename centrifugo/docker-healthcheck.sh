#!/bin/sh
set -e

host="$(hostname --ip-address || echo '127.0.0.1')"

if curl -fs "http://$host:8000/health"; then
    exit 0
fi

exit 1
