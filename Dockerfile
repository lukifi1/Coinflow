FROM node:23

RUN mkdir -p /opt/app/node_modules

WORKDIR /opt/app
COPY package*.json ./
COPY app.js ./

RUN npm install

EXPOSE 8080

CMD ["node", "app.js"]
