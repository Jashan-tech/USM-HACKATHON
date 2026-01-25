# Development Dockerfile
FROM node:20-alpine

WORKDIR /app

# Install dependencies for Tesseract.js and other native modules
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Expose port 3000
EXPOSE 3000

# Default command (overridden in docker-compose)
CMD ["npm", "run", "dev"]
