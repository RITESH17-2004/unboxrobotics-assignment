FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Since this is local dev we can just run the dev server
# Or we can build it. We'll use dev for simplicity with docker-compose.
CMD ["npm", "run", "dev"]
