# Deployment Reference

## Purpose

Use this file when the task touches deployment, domains, runtime entrypoints, Docker, or production routing.

## Canonical Targets

- Production domain: `https://louisko.com/`
- Production Bazi page: `https://louisko.com/apps/bazi/`
- Legacy Bazi compatibility URL: `https://louisko.com/bazi.html`
- Production Photo page: `https://louisko.com/apps/photo/`
- Production Photo albums API: `https://louisko.com/api/photo-cloud/albums`
- Production Photo object API: `https://louisko.com/api/photo-cloud/object?key=<storageKey>`
- Production Bazi profiles API: `https://louisko.com/api/bazi/profiles`（需 `X-Bazi-Owner-Key`）
- GitHub Pages mirror: `https://kolouis-tw.github.io/louisko-website/`
- Repository: `https://github.com/kolouis-tw/louisko-website`

## Current Service Mapping

- Primary Zeabur service: `louisko-node-photo`
- Primary Zeabur service id: `6a118115a458d428a0ab1ee4`
- Primary generated domain: `https://louisko-node-photo.zeabur.app/`
- Legacy backup service: `bazi-website`
- Legacy backup generated domain: `https://bazi-ko.zeabur.app/`

## Runtime Notes

- The current production entry combines the main site, subpages, and Photo API behind the same Node service.
- `server.js` is expected to listen on `PORT` and fall back to `8080`.
- The root `Dockerfile` runs `npm start` on Node 20 slim.

```Dockerfile
FROM node:20-bookworm-slim

WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY . .

ENV NODE_ENV=production
EXPOSE 8080
CMD ["npm", "start"]
```

## Dated Operational Snapshot

The items below are useful context, but they are time-sensitive and should be verified before making production decisions.

- As of `2026-05-24`, `louisko.com` had been moved from the old static `bazi-website` service to `louisko-node-photo`.
- As of `2026-05-24`, `https://louisko.com/api/photo-cloud/albums` was expected to return JSON `200`.
- As of `2026-05-24`, Photo metadata was expected to be single-output JPG mode with `thumbnailRefs=0` and `missingStorageKeys=0`.
- As of `2026-05-24`, the R2 metadata snapshot was expected to contain only `Phone` and `MacBook`; verify this instead of assuming it is still true.

## Security Rule

- Keep Zeabur tokens, Cloudflare credentials, and other secrets in local secure storage only.
- Never write secrets into the repository, docs, commits, issues, or chat replies.
