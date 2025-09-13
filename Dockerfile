# Use your original base
FROM node:18-bullseye-slim

# Create app directory
WORKDIR /usr/src/app

# Copy package.json and install dependencies
COPY package*.json ./
RUN npm install --production

# Copy the rest of the app
COPY . .

# Install curl (needed for entrypoint health checks)
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Make entrypoint executable
RUN chmod +x /usr/src/app/docker-entrypoint.sh

# Default command (can be overridden in docker-compose)
CMD ["node", "index.js"]