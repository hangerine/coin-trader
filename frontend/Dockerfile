FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

# Source code will be mounted via volume
CMD ["npm", "run", "dev", "--", "--host"]
