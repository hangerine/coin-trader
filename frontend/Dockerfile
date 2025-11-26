FROM node:20-slim

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Configure npm to bypass SSL verification for corporate networks
RUN npm config set strict-ssl false

# Install dependencies (includes rollup native binary)
RUN npm ci

# Source code will be mounted via volume
CMD ["npm", "run", "dev", "--", "--host"]
