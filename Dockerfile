FROM node:21.0.0-alpine AS base

# Create the app directory and set owner and permissions
RUN mkdir -p /app
RUN chown -R node:node /app && chmod -R 770 /app
WORKDIR /app

# Update NPM version
RUN npm install -g npm@10.2.1

# builds image for development
FROM base AS development
WORKDIR /app
COPY --chown=node:node . ./
USER node
RUN npm install --loglevel warn
EXPOSE 3001
CMD ["npm", "run", "startdev"]

# builds image for production
FROM base AS production

ARG NODE_ENV=production
ENV NODE_ENV $NODE_ENV

WORKDIR /app
COPY --chown=node:node ./package.json ./package.json
COPY --chown=node:node ./package-lock.json ./package-lock.json
USER node
RUN npm install --loglevel warn --omit=dev
COPY --chown=node:node . ./
RUN npm run build
RUN rm -r $(ls -A | grep -v dist)
EXPOSE 3001
CMD ["node", "dist/bundle.js"]