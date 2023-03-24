FROM node:alpine

# Create app directory
WORKDIR /app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./

RUN npm install -g npm@9.6.2
RUN npm ci --omit=dev

# Bundle app source
COPY . /app

EXPOSE 3001

CMD ["npm", "start"]