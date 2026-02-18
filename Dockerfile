FROM node:18-alpine

WORKDIR /var/stremio_addon

# Copy package files first for better layer caching
COPY package.json ./
RUN npm install --only=prod --no-package-lock

# Copy application files (controlled by .dockerignore)
COPY src/ ./src/
COPY static/ ./static/

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD sh -c "wget --spider -q http://localhost:\${STREMIO_PORN_PORT:-8080}/ || exit 1"

CMD ["node", "src/index.js"]
