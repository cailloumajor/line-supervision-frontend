FROM debian:buster AS gosu

# grab gosu for easy step-down from root
# https://github.com/tianon/gosu/releases
# renovate: datasource=github-release depName=tianon/gosu
ENV GOSU_VERSION=1.12
# hadolint ignore=DL3008,DL4006,SC2015,SC2086,SC2155
RUN set -eux ; \
    apt-get update; \
    apt-get install -y --no-install-recommends ca-certificates dirmngr gnupg wget; \
    dpkgArch="$(dpkg --print-architecture | awk -F- '{ print $NF }')"; \
    wget -nv -O /usr/local/bin/gosu "https://github.com/tianon/gosu/releases/download/$GOSU_VERSION/gosu-$dpkgArch"; \
    wget -nv -O /usr/local/bin/gosu.asc "https://github.com/tianon/gosu/releases/download/$GOSU_VERSION/gosu-$dpkgArch.asc"; \
    export GNUPGHOME="$(mktemp -d)"; \
    wget -nv -O- https://keys.openpgp.org/vks/v1/by-fingerprint/B42F6819007F00F88E364FD4036A9C25BF357DD4 | gpg --batch --import; \
    gpg --batch --verify /usr/local/bin/gosu.asc /usr/local/bin/gosu; \
    gpgconf --kill all; \
    chmod +x /usr/local/bin/gosu; \
    gosu --version; \
    gosu nobody true

FROM golang:1.17.1-buster AS builder

WORKDIR /usr/src/centrifugo

# renovate: datasource=github-release depName=centrifugal/centrifugo
ENV CENTRIFUGO_VERSION=v2.8.2
ENV CENTRIFUGO_REPO=https://github.com/centrifugal/centrifugo.git
RUN set -eux; \
    git clone --depth 1 --branch "$CENTRIFUGO_VERSION" "$CENTRIFUGO_REPO" "$PWD"; \
    go build

FROM debian:buster-slim AS final

# hadolint ignore=DL3008
RUN set -eux; \
    useradd --user-group --system --no-log-init centrifugo; \
    apt-get update; \
    apt-get install -y --no-install-recommends curl; \
    rm -rf /var/lib/apt/lists/*

COPY --from=builder /usr/src/centrifugo/centrifugo /usr/local/bin/

ENV CENTRIFUGO_HEALTH=true
COPY docker-healthcheck.sh /usr/local/bin/
HEALTHCHECK CMD ["docker-healthcheck.sh"]

COPY --from=gosu /usr/local/bin/gosu /usr/local/bin/
COPY docker-entrypoint.sh /usr/local/bin/
ENTRYPOINT ["docker-entrypoint.sh"]

EXPOSE 8000
CMD ["centrifugo"]
