FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY prisma ./prisma
RUN npm run db:generate

COPY src ./src

EXPOSE 4007

CMD ["sh", "-c", "npx prisma db push --skip-generate && exec node src/index.js"]
