FROM node:20-alpine
WORKDIR /app

# Prisma on musl needs OpenSSL runtime libraries available in the container.
RUN apk add --no-cache openssl libc6-compat

COPY package*.json ./
COPY prisma ./prisma
RUN npm install

COPY . .
RUN npx prisma generate

ENV PORT=4003
EXPOSE 4003
CMD ["node", "src/index.js"]