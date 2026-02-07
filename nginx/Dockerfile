# Nginx Dockerfile for Restaurant Management Platform
# Custom nginx image with optimized configuration

FROM nginx:1.25-alpine

# Install additional packages
RUN apk add --no-cache curl

# Remove default nginx configuration
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom configuration files
COPY nginx.conf /etc/nginx/nginx.conf
COPY server.conf /etc/nginx/server.conf
COPY proxy_params.conf /etc/nginx/proxy_params.conf

# Create necessary directories
RUN mkdir -p /var/www/static /var/www/media /var/www/certbot /var/log/nginx

# Set proper permissions
RUN chown -R nginx:nginx /var/www /var/log/nginx

# Expose ports
EXPOSE 80 443

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost/health || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
