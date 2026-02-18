FROM node:18-alpine

WORKDIR /var/stremio_addon

# Copy package files first for better layer caching
COPY package.json ./
RUN npm install --only=prod --no-package-lock

# Copy application files (controlled by .dockerignore)
COPY dist/ ./dist/
COPY static/ ./static/

EXPOSE ${STREMIO_PORN_PORT:-8080}

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget --spider -q http://localhost:${STREMIO_PORN_PORT:-8080}/ || exit 1

CMD ["node", "dist/index.js"]
