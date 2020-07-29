FROM node:12.18 as builder

ARG INFLUX_DB_NAME
ENV INFLUX_DB_NAME ${INFLUX_DB_NAME}
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install
COPY public ./public
COPY src ./src
COPY .browserslistrc .env .eslintrc.js .prettierrc babel.config.js tsconfig.json vue.config.js ./
RUN yarn run build

FROM caddy:2.1.1

COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=builder /app/dist /site

EXPOSE 80
