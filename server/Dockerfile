FROM node:18-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci --production

COPY src/ ./src/
COPY tsconfig.json ./
RUN npm run build

RUN mkdir -p data

EXPOSE 5000

CMD ["node", "dist/app.js"]
