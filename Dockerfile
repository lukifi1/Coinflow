FROM node:23

RUN mkdir -p /opt/app/node_modules

WORKDIR /opt/app
COPY package*.json ./
COPY server.js ./

RUN npm install

COPY ./www ./www

EXPOSE 8080

CMD ["node", "server.js"]
