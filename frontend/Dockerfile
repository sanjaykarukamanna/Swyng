# Stage 1: Build React application with Vite
FROM node:20-alpine AS builder

WORKDIR /app

# Cache dependency layer
COPY package*.json ./
RUN npm ci

# Build production bundle
COPY . .
RUN npm run build

# Stage 2: Serve via pinned, lightweight Nginx
FROM nginx:1.27-alpine

# Remove default nginx welcome page configuration
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom reverse-proxy and SPA routing configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy compiled static assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
