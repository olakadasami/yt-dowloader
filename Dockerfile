# ---------- Build Stage ----------
FROM node:20-alpine AS builder

WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile

COPY . .
RUN pnpm run build


# ---------- Runtime Stage ----------
FROM node:20-alpine

# Install ffmpeg + yt-dlp
RUN apk add --no-cache \
    ffmpeg \
    alsa-lib \
    libpulse \
    libxcb \
    libx11 \
    libxext \
    libxfixes \
    curl \
 && curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
 && chmod a+rx /usr/local/bin/yt-dlp


WORKDIR /app

# Copy built output only
COPY --from=builder /app/.output ./.output
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules

RUN mkdir -p /app/downloads

EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]
