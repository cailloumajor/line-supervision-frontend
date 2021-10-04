# syntax=docker/dockerfile:1.3
FROM centrifugo/centrifugo:v2.8.6

RUN addgroup -S centrifugo && adduser -G centrifugo -S -H centrifugo

ENV CENTRIFUGO_HEALTH=true
COPY docker-healthcheck.sh /usr/local/bin/
HEALTHCHECK CMD ["docker-healthcheck.sh"]

USER centrifugo

EXPOSE 8000
