FROM node:21.7.1-alpine3.19
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
CMD [ "node", "dist/main" ]
