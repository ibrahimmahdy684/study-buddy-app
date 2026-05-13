FROM node:20-bookworm-slim as build

WORKDIR /app

ARG VITE_GRAPHQL_ENDPOINT=http://localhost:4000/graphql
ARG VITE_API_BASE_URL=http://localhost:4000
ENV VITE_GRAPHQL_ENDPOINT=${VITE_GRAPHQL_ENDPOINT}
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

COPY package*.json ./

RUN npm install --include=optional

COPY . .

RUN npm run build

FROM node:20-bookworm-slim

WORKDIR /app

RUN npm install -g serve

COPY --from=build /app/dist ./dist

EXPOSE 3000

CMD ["serve", "-s", "dist", "-l", "3000"]
