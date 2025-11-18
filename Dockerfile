# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Accept build arguments
ARG PUBLIC_API_BASEURL
ARG PUBLIC_SITE_URL

# Set as environment variables for build
ENV PUBLIC_API_BASEURL=$PUBLIC_API_BASEURL
ENV PUBLIC_SITE_URL=$PUBLIC_SITE_URL

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source files
COPY . .

# Build the application with environment variables
RUN npm run build

# Production stage with nginx
FROM nginx:alpine

# Copy built static files from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom nginx config
COPY nginx.conf /etc/nginx/nginx.conf

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
