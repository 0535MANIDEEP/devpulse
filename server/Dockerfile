FROM node:18-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY src/ ./src/
COPY tsconfig.json ./
RUN npm run build
RUN npm ci --production && npm cache clean --force

RUN mkdir -p data

EXPOSE 5000

CMD ["node", "dist/app.js"]
