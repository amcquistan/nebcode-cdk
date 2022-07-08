FROM node:16

WORKDIR /usr/src/app

COPY *.json ./

RUN npm install

COPY . .

RUN npm run build

CMD ["node", "index.js"]
