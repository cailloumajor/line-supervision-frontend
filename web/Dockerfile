FROM node:14.15 as frontend-builder

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
RUN yarn run build

FROM golang:1.15 as server-builder

WORKDIR /usr/src/app
COPY server/go.mod server/go.sum server/main.go ./
RUN CGO_ENABLED=0 go build -o server

FROM scratch

COPY --from=frontend-builder /app/dist /site
COPY --from=server-builder /usr/src/app/server /server

EXPOSE 8080

CMD ["/server"]
