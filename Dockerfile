# Multi-stage Dockerfile for Crypto Donation Platform
# Stage 1: Build and compile smart contracts
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source files
COPY contracts/ ./contracts/
COPY scripts/ ./scripts/
COPY hardhat.config.js ./

# Compile contracts
RUN npx hardhat compile

# Stage 2: Hardhat node runtime
FROM node:20-alpine AS hardhat-node

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY --from=builder /app/contracts ./contracts
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/artifacts ./artifacts
COPY --from=builder /app/cache ./cache
COPY hardhat.config.js ./

# Expose Hardhat node port
EXPOSE 8545

# Start Hardhat node
CMD ["npm", "run", "node"]

# Stage 3: Frontend with nginx
FROM nginx:alpine AS frontend

# Copy frontend files
COPY frontend/ /usr/share/nginx/html/

# Copy custom nginx config
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
