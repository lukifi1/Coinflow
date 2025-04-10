FROM node:23

RUN mkdir -p /opt/app/node_modules

WORKDIR /opt/app
COPY package*.json ./
COPY .env ./
COPY server.js ./
COPY app.js ./

RUN npm install
RUN npm install express
RUN npm install dotenv
RUN npm install pg

COPY ./www ./www

EXPOSE 8080

# https://docs.docker.com/reference/dockerfile/#healthcheck
HEALTHCHECK --interval=10s --timeout=3s \
  CMD curl -f http://localhost:8080/api/healthcheck || exit 1

CMD npm start
