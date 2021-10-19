# syntax=docker/dockerfile:1.3
FROM centrifugo/centrifugo:v3.0.5

RUN addgroup -S centrifugo && adduser -G centrifugo -S -H centrifugo

ENV CENTRIFUGO_HEALTH=true
COPY docker-healthcheck.sh /usr/local/bin/
HEALTHCHECK CMD ["docker-healthcheck.sh"]

USER centrifugo

EXPOSE 8000
