FROM node:alpine

#PM2 will be used as PID 1 process
RUN npm install -g pm2@latest

# Copy package json files for services
COPY client/ /app/client/
COPY server/ /app/server/

RUN mkdir -p /app/data

WORKDIR /app

# Install packages
RUN npm config set loglevel warn \
# To mitigate issues with npm saturating the network interface we limit the number of concurrent connections
    && npm config set maxsockets 5 \
    && npm config set only production \
    && npm config set progress false \
    && cd ./client \
    && npm install --force --omit=dev \
    && cd ../server \
    && npm install --omit=dev

# Copy process.json file
COPY process.json ./

# Expose ports
EXPOSE 3000
EXPOSE 3001

# Start PM2 as PID 1 process
ENTRYPOINT ["pm2", "--no-daemon", "start"]

# Actual script to start can be overridden from `docker run`
CMD ["process.json"]