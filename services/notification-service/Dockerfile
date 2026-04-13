FROM node:20-alpine
WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma
RUN npm install

COPY . .
RUN npx prisma generate

EXPOSE 4003

CMD ["sh", "-c", "npx prisma db push --skip-generate && exec node src/index.js"]
