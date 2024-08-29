# syntax=docker/dockerfile:1

ARG NODE_VERSION=20.0.0

FROM node:${NODE_VERSION}-alpine as base

FROM base as build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run bundle

FROM base
WORKDIR /usr/src
COPY --from=build /app/bundle /usr/src
# Expose the port that the application listens on.
EXPOSE 3000
# Run the application.
CMD node ./server.mjs
