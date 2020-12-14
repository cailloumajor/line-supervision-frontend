ARG NODE_TAG
ARG GOLANG_TAG

FROM node:12.18 as frontend-builder

ARG INFLUX_DB_NAME
ENV INFLUX_DB_NAME ${INFLUX_DB_NAME}
WORKDIR /app
COPY frontend/package.json frontend/yarn.lock ./
RUN yarn install
COPY frontend/public ./public
COPY frontend/src ./src
COPY frontend/.browserslistrc \
     frontend/.eslintrc.js \
     frontend/.prettierrc \
     frontend/babel.config.js \
     frontend/tsconfig.json \
     frontend/vue.config.js \
     ./
RUN yarn run build --modern

FROM golang:1.15 as server-buider

WORKDIR /usr/src/app
COPY server/go.mod server/go.sum server/main.go ./
RUN CGO_ENABLED=0 go build -o server

FROM scratch

COPY --from=frontend-builder /app/dist /site
COPY --from=server-buider /usr/src/app/server /server

EXPOSE 8080

CMD ["/server"]
