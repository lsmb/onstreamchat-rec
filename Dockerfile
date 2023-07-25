# syntax=docker/dockerfile:1

FROM node:18-alpine
WORKDIR /app
COPY ./app .
RUN apk add chromium
RUN npm install
RUN npm install typescript
RUN npm install npx
RUN npx tsc

CMD ["node", "dist/index.js"]
