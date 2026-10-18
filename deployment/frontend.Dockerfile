# ClassSight frontend: Vite build served by nginx.
# Lives in deployment/ so nothing under frontend/ has to change.
# Build context is the repo root:
#   docker build -f deployment/frontend.Dockerfile --build-arg VITE_API_BASE_URL=http://localhost:8000 .

FROM node:22-alpine AS build
WORKDIR /src
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
# Vite inlines this at build time; it is the address browsers use to reach the API.
ARG VITE_API_BASE_URL=http://localhost:8000
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
RUN npm run build

FROM nginx:1.27-alpine
COPY deployment/nginx/frontend.conf /etc/nginx/conf.d/default.conf
COPY --from=build /src/dist /usr/share/nginx/html
EXPOSE 80
