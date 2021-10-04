#!/bin/sh
set -e

host="$(hostname -i || echo '127.0.0.1')"

if wget -q -O /dev/null "http://$host:8000/health"; then
    exit 0
fi

exit 1
