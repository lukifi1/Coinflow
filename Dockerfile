FROM node:23

RUN mkdir -p /opt/app/node_modules

WORKDIR /opt/app
COPY package*.json ./
COPY .env ./
# COPY server.js ./
COPY app.js ./

RUN npm install
RUN npm install express
RUN npm install dotenv

COPY ./www ./www

EXPOSE 8080

# CMD ["node", "server.js"]
CMD ["node", "app.js"]
