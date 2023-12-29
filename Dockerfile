FROM node:21.5.0-alpine AS builder

# Create the app directory and set owner and permissions
RUN mkdir -p /app
RUN chown -R node:node /app && chmod -R 770 /app
WORKDIR /app

# Update NPM version
RUN npm install -g npm@10.2.1

COPY ./package.json ./package.json
COPY ./package-lock.json ./package-lock.json
RUN npm install --loglevel warn
COPY . ./
RUN npm run build

# ==================================
#        Development Build
# ==================================
FROM node:21.5.0-alpine AS development

# Create the app directory and set owner and permissions
RUN mkdir -p /app
RUN chown -R node:node /app && chmod -R 770 /app
WORKDIR /app

COPY --chown=node:node --from=builder /app ./

USER node

EXPOSE 3000
CMD ["npm", "run", "test"]


# ==================================
#        Production Build
# ==================================
FROM node:21.5.0-alpine AS production

# Create the app directory and set owner and permissions
RUN mkdir -p /app
RUN chown -R node:node /app && chmod -R 770 /app
WORKDIR /app

COPY --chown=node:node --from=builder /app/dist ./dist
COPY --chown=node:node --from=builder /app/package.json ./package.json
COPY --chown=node:node --from=builder /app/package-lock.json ./package-lock.json
COPY --chown=node:node --from=builder /app/LICENSE ./LICENSE
COPY --chown=node:node --from=builder /app/*.md ./

USER node

EXPOSE 3000
CMD ["npm", "run", "prod"]