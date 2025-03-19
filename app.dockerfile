FROM node:18-slim AS base

FROM base AS deps
WORKDIR /app

COPY ui/package.json ui/yarn.lock ./
RUN yarn install --frozen-lockfile --network-timeout 600000

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY ui ./

ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_WS_URL
ARG NEXT_PUBLIC_PYTHON_API_URL=http://perplexica-python-cache:8000

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_WS_URL=$NEXT_PUBLIC_WS_URL
ENV NEXT_PUBLIC_PYTHON_API_URL=$NEXT_PUBLIC_PYTHON_API_URL

RUN yarn build

CMD ["yarn", "start"]