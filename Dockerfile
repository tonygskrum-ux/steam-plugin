# Lets Glama (and similar sandboxes) build and introspect this
# zero-dependency stdio server. Not required to run it locally.
FROM node:20-alpine
WORKDIR /app
COPY server/index.mjs ./server/index.mjs
USER node
ENTRYPOINT ["node", "server/index.mjs"]
