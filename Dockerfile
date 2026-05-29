# Backend Dockerfile
FROM node:20-alpine

WORKDIR /app

# Install git and system compilation tools
RUN apk add --no-cache git python3 make g++

# Copy package management blueprints first to cache npm installation layer
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies cleanly (skipping client-side post-install logic scripts)
RUN npm install --ignore-scripts

# Pull in your active raw TypeScript source code
COPY src ./src

# Compile TypeScript down to production-ready JavaScript in the dist folder
RUN npm run build

# Expose development runtime ports
ARG PORT=3001
ENV PORT=${PORT}
EXPOSE ${PORT}

# ✅ FIXED: Correct directory path matching the hardcoded Baileys code session storage parameters
RUN mkdir -p /app/auth_info_baileys

CMD ["node", "dist/server.js"]
