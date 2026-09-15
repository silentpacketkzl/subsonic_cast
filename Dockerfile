# Production Dockerfile for Arpeggi Subsonic & Spotify Connect Receiver
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Set environment
ENV NODE_ENV=production
ENV PORT=8080

# Copy application files
COPY package.json ./
COPY server.js ./
COPY public/ ./public/

# Use unprivileged built-in node user for security
USER node

# Expose default port
EXPOSE 8080

# Health check to ensure relay and static server are healthy
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/api/info', (r) => { process.exit(r.statusCode === 200 ? 0 : 1) })"

# Start Arpeggi Connect Server
CMD ["node", "server.js"]
