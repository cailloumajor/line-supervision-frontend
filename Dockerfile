# syntax=docker/dockerfile:1.3

FROM node:16.20.2 AS frontend-builder

WORKDIR /usr/src/app

ENV YARN_CACHE_FOLDER=/var/cache/yarn
COPY package.json yarn.lock ./
RUN --mount=type=cache,target=/var/cache/yarn \
    yarn install

COPY public ./public
COPY src ./src
COPY .browserslistrc \
     .eslintignore \
     .eslintrc.js \
     .prettierrc \
     babel.config.js \
     tsconfig.json \
     vue.config.js \
     ./
RUN yarn run build


FROM busybox:1.36.1

COPY --from=frontend-builder /usr/src/app/dist /site

COPY docker-run.sh /usr/local/bin/

VOLUME [ "/srv/www" ]

CMD [ "/usr/local/bin/docker-run.sh" ]
