# Build Stage: Constructing the React Application using Vite natively
FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .

# Emits the production bundle to /app/dist
RUN npm run build


# Production Stage: Serving the final static bundle via NGINX
FROM nginx:alpine

# Copy compiled react scripts
COPY --from=build /app/dist /usr/share/nginx/html

# Replace default NGINX configuration to securely proxy FastAPI calls and support React Router (SPA)
RUN echo 'server { \
    listen 80; \
    server_name _; \
    location / { \
    root /usr/share/nginx/html; \
    index index.html index.htm; \
    try_files $uri $uri/ /index.html; \
    } \
    location /api/ { \
    proxy_pass http://orthopar_backend:8000/; \
    proxy_set_header Host $host; \
    proxy_set_header X-Real-IP $remote_addr; \
    } \
    }' > /etc/nginx/conf.d/default.conf

# Expose Web Port
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
