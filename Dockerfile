# syntax=docker/dockerfile:1

FROM node:18-alpine
WORKDIR /app
COPY ./app .
RUN apk add bash xvfb-run ffmpeg chromium xdotool
RUN npm install

CMD ["node", "index.js"]
