FROM node:20-bookworm-slim AS build

WORKDIR /app

ARG VITE_GRAPHQL_ENDPOINT=http://localhost:4000/graphql
ARG VITE_API_BASE_URL=http://localhost:4000
ARG VITE_MESSAGING_WS_URL=ws://localhost:4007/graphql
ENV VITE_GRAPHQL_ENDPOINT=${VITE_GRAPHQL_ENDPOINT}
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV VITE_MESSAGING_WS_URL=${VITE_MESSAGING_WS_URL}

COPY package*.json ./

RUN npm install --include=optional

COPY . .

RUN npm run build

FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html

RUN printf 'server {\n\
    listen 3000;\n\
    root /usr/share/nginx/html;\n\
    index index.html;\n\
    location / {\n\
        try_files $uri $uri/ /index.html;\n\
    }\n\
}\n' > /etc/nginx/conf.d/default.conf

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]
