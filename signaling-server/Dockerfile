FROM node:22-alpine

WORKDIR /app

# Copy package files
COPY signaling-server/package.json signaling-server/package-lock.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application
COPY signaling-server/server.js ./

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 3002

CMD ["node", "server.js"]
