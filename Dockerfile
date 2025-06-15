# Multi-stage build
FROM klakegg/hugo:0.111.3-alpine AS builder

# Set working directory
WORKDIR /src

# Copy Hugo site files
COPY . .

# Build the Hugo site
RUN hugo --minify

# Production stage
FROM nginx:alpine

# Copy the built site from the builder stage
COPY --from=builder /src/public /usr/share/nginx/html/

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]