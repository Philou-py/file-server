FROM node:16
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
RUN chown -R node:node .
RUN mkdir /file-server
RUN chown -R node:node /file-server
USER node
EXPOSE 3001
CMD ["npm", "run", "start"]
