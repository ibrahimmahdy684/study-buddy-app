FROM node:22-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy Prisma files
COPY prisma ./prisma

# Generate Prisma client
RUN npm run db:generate

# Copy source code
COPY src ./src

# Expose port
EXPOSE 4005

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4005/.well-known/apollo/server-health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start service
CMD ["npm", "start"]