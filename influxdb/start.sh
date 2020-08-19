# shellcheck shell=bash

for envvar in "INFLUX_DB_NAME" "INFLUX_RP_DURATION"; do
    if [ -z "${!envvar}" ]; then
        echo "Error: $envvar environment variable empty or not set"
        exit 1
    fi
done

$INFLUX_CMD "CREATE DATABASE $INFLUX_DB_NAME WITH DURATION $INFLUX_RP_DURATION"
